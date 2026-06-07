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
