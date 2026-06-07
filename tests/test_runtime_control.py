from __future__ import annotations

from types import SimpleNamespace

import pytest

from core import runtime_control


def test_get_runtime_states_reports_running_and_stopped(monkeypatch):
    fake_connections = [
        SimpleNamespace(status="LISTEN", laddr=("127.0.0.1", 8501), pid=111),
    ]

    monkeypatch.setattr(runtime_control.psutil, "CONN_LISTEN", "LISTEN")
    monkeypatch.setattr(runtime_control.psutil, "net_connections", lambda kind: fake_connections)

    states = runtime_control.get_runtime_states()

    assert [state.name for state in states] == ["streamlit", "fastapi", "nextjs"]
    assert states[0].status == "running"
    assert states[0].pid == 111
    assert states[1].status == "stopped"
    assert states[2].status == "stopped"


def test_stop_service_is_idempotent_when_already_stopped(monkeypatch):
    monkeypatch.setattr(runtime_control.psutil, "net_connections", lambda kind: [])

    result = runtime_control.stop_service("fastapi")

    assert result["status"] == "success"
    assert "既に停止" in result["message"]


def test_stop_service_rejects_unknown_service():
    with pytest.raises(ValueError):
        runtime_control.stop_service("unknown")


def test_terminate_process_tree_terminates_children_and_escalates(monkeypatch):
    events: list[str] = []

    class FakeProcess:
        def __init__(self, pid: int, children: list["FakeProcess"] | None = None):
            self.pid = pid
            self._children = children or []

        def children(self, recursive: bool = True):
            return self._children

        def terminate(self):
            events.append(f"terminate:{self.pid}")

        def kill(self):
            events.append(f"kill:{self.pid}")

    child = FakeProcess(2)
    root = FakeProcess(1, [child])

    wait_calls = {"count": 0}

    def fake_process(pid: int):
        assert pid == 1
        return root

    def fake_wait_procs(processes, timeout):
        wait_calls["count"] += 1
        if wait_calls["count"] == 1:
            return [], list(processes)
        return list(processes), []

    monkeypatch.setattr(runtime_control.psutil, "Process", fake_process)
    monkeypatch.setattr(runtime_control.psutil, "wait_procs", fake_wait_procs)

    assert runtime_control._terminate_process_tree(1) is True
    assert events == ["terminate:1", "terminate:2", "kill:1", "kill:2"]


class _FakeProc:
    def __init__(self, pid, cwd, cmdline, parents=(), children=(), on_terminate=None):
        self.pid = pid
        self._cwd = cwd
        self._cmdline = list(cmdline)
        self._parents = list(parents)
        self._children = list(children)
        self._on_terminate = on_terminate
        self.terminated = False

    def cwd(self):
        return self._cwd

    def cmdline(self):
        return list(self._cmdline)

    def parents(self):
        return list(self._parents)

    def children(self, recursive: bool = True):
        return list(self._children)

    def terminate(self):
        self.terminated = True
        if self._on_terminate:
            self._on_terminate()

    def kill(self):  # pragma: no cover - escalation path不要
        pass


def _listen(pid, port=8000):
    return SimpleNamespace(status="LISTEN", laddr=("127.0.0.1", port), pid=pid)


def test_stop_service_blocked_when_not_clipbox(monkeypatch, tmp_path):
    """ポート占有プロセスが ClipBox（cwd+cmdline）でなければ停止せず blocked。"""
    other = _FakeProc(200, cwd=str(tmp_path), cmdline=["python", "-m", "http.server", "8000"])
    monkeypatch.setattr(runtime_control.psutil, "net_connections", lambda kind: [_listen(200)])
    monkeypatch.setattr(runtime_control.psutil, "Process", lambda pid: {200: other}[pid])

    result = runtime_control.stop_service("fastapi")

    assert result["status"] == "blocked"
    assert other.terminated is False


def test_stop_service_resolves_reload_parent(monkeypatch):
    """--reload 相当: listener 子に marker 無し・親に marker(cwd=repo) なら親 tree を停止する。"""
    repo = str(runtime_control.REPO_ROOT)
    state = {"alive": True}

    def stop_all():
        state["alive"] = False

    child = _FakeProc(201, cwd=repo, cmdline=["python", "-c", "spawn"])
    parent = _FakeProc(
        100,
        cwd=repo,
        cmdline=["python", "-m", "uvicorn", "api_app:app", "--reload"],
        children=[child],
        on_terminate=stop_all,
    )
    child._parents = [parent]
    procs = {201: child, 100: parent}

    monkeypatch.setattr(
        runtime_control.psutil,
        "net_connections",
        lambda kind: [_listen(201)] if state["alive"] else [],
    )
    monkeypatch.setattr(runtime_control.psutil, "Process", lambda pid: procs[pid])
    monkeypatch.setattr(runtime_control.psutil, "wait_procs", lambda processes, timeout: (list(processes), []))

    result = runtime_control.stop_service("fastapi")

    assert result["status"] == "success"
    assert parent.terminated is True


def test_stop_web_stack_stops_nextjs_then_fastapi(monkeypatch):
    calls: list[str] = []

    def fake_stop(name):
        calls.append(name)
        return {"status": "success", "message": name}

    monkeypatch.setattr(runtime_control, "stop_service", fake_stop)

    result = runtime_control.stop_web_stack()

    assert calls == ["nextjs", "fastapi"]
    assert result["status"] == "success"
