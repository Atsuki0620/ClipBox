"""
ClipBox - Runtime control（dev/ops 用のサービス状態取得・停止）。

役割:
    Streamlit / FastAPI / Next.js の起動状態をポート監視で判定（lamp 表示用）し、
    各サービスを停止する。停止は **ClipBox のプロセスに限定**する。

【設計制約】
- lamp 表示（get_runtime_states）はポート使用＝running を返す（表示用途）。
- 停止（stop_service / stop_web_stack）は **cwd がリポジトリ配下 AND cmdline にサービス固有マーカー**を満たす
  ClipBox プロセスのみを対象にする。確認できないポート占有プロセスは停止しない（status="blocked"）。
- `uvicorn --reload` では LISTEN PID が reloader 子・マーカーが親に出ることがあるため、listener から
  祖先を辿って ClipBox service root を特定し、その root のプロセスツリーを停止する。
- FastAPI は本 API の実行主体のため、Web スタック停止は Next.js → FastAPI の順で行う（stop_web_stack）。
- `streamlit` を import しない。

【依存関係】
core.runtime_control → psutil
api.runtime → core.runtime_control
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Literal, Optional

import psutil

RuntimeStatus = Literal["running", "stopped", "unknown"]

# リポジトリルート（core/ の1つ上）。ClipBox プロセス判定の cwd 基準。
REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class RuntimeServiceSpec:
    name: str
    label: str
    port: int
    # cmdline に含まれていれば ClipBox 由来とみなすマーカー（小文字で部分一致）。
    markers: tuple[str, ...]


@dataclass(frozen=True)
class RuntimeServiceState:
    name: str
    label: str
    port: int
    status: RuntimeStatus
    pid: int | None = None


SERVICE_SPECS: Dict[str, RuntimeServiceSpec] = {
    "streamlit": RuntimeServiceSpec("streamlit", "Streamlit", 8501, ("streamlit_app.py",)),
    "fastapi": RuntimeServiceSpec("fastapi", "FastAPI", 8000, ("api_app",)),
    "nextjs": RuntimeServiceSpec("nextjs", "Next.js", 3000, ("next",)),
}

# Web スタック（FastAPI を最後に止める）。
WEB_STACK_ORDER = ("nextjs", "fastapi")

_LISTEN_STATES = {psutil.CONN_LISTEN}
_TERMINATE_TIMEOUT_SECONDS = 3.0


def get_service_spec(service_name: str) -> RuntimeServiceSpec:
    try:
        return SERVICE_SPECS[service_name]
    except KeyError as exc:
        raise ValueError(f"unknown runtime service: {service_name}") from exc


def get_runtime_states() -> List[RuntimeServiceState]:
    return [_get_runtime_state(spec) for spec in SERVICE_SPECS.values()]


def stop_service(service_name: str) -> Dict[str, str]:
    """ClipBox の指定サービスを停止する。ClipBox と確認できないポート占有は停止しない（blocked）。"""
    spec = get_service_spec(service_name)
    pids = _get_listener_pids(spec.port)
    if not pids:
        return {"status": "success", "message": f"{spec.label} は既に停止しています。"}

    # listener から祖先を辿り ClipBox service root を特定。
    roots: Dict[int, psutil.Process] = {}
    for pid in pids:
        root = _resolve_service_root(pid, spec)
        if root is not None:
            roots[root.pid] = root

    if not roots:
        return {
            "status": "blocked",
            "message": (
                f"ポート {spec.port} の使用元を ClipBox の {spec.label} として確認できないため停止しません。"
            ),
        }

    stopped_any = False
    for root in roots.values():
        stopped_any = _terminate_process_tree(root.pid) or stopped_any

    if not stopped_any:
        return {"status": "error", "message": f"{spec.label} を停止できませんでした。"}

    # 停止後も ClipBox の該当サービスがポートを掴んでいれば error（非 ClipBox の占有は無視）。
    remaining = _get_listener_pids(spec.port)
    if any(_resolve_service_root(pid, spec) is not None for pid in remaining):
        return {
            "status": "error",
            "message": f"{spec.label} の停止後もポート {spec.port} を掴んだままです。",
        }

    return {"status": "success", "message": f"{spec.label} を停止しました。"}


def stop_web_stack() -> Dict[str, str]:
    """Web スタック（Next.js → FastAPI の順）を停止する。

    FastAPI を先に止めると後続を呼べないため順序固定。FastAPI 停止は本 API 自身の終了になり得るため、
    呼び出し側（フロント）は応答を待たずに画面遷移する前提。
    """
    results: Dict[str, Dict[str, str]] = {}
    for name in WEB_STACK_ORDER:
        results[name] = stop_service(name)

    statuses = {name: r.get("status") for name, r in results.items()}
    messages = " / ".join(f"{name}: {results[name].get('message', '')}" for name in WEB_STACK_ORDER)

    if any(s == "error" for s in statuses.values()):
        overall = "error"
    elif any(s == "blocked" for s in statuses.values()):
        overall = "blocked"
    else:
        overall = "success"
    return {"status": overall, "message": messages}


def _get_runtime_state(spec: RuntimeServiceSpec) -> RuntimeServiceState:
    try:
        pids = _get_listener_pids(spec.port)
    except (psutil.Error, OSError):
        return RuntimeServiceState(spec.name, spec.label, spec.port, "unknown")

    if not pids:
        return RuntimeServiceState(spec.name, spec.label, spec.port, "stopped")

    return RuntimeServiceState(spec.name, spec.label, spec.port, "running", pid=sorted(pids)[0])


def _get_listener_pids(port: int) -> set[int]:
    pids: set[int] = set()
    for conn in psutil.net_connections(kind="inet"):
        if conn.status not in _LISTEN_STATES:
            continue
        local_address = conn.laddr
        if not local_address or len(local_address) < 2:
            continue
        if local_address[1] != port:
            continue
        if conn.pid is not None:
            pids.add(conn.pid)
    return pids


def _resolve_service_root(listener_pid: int, spec: RuntimeServiceSpec) -> Optional[psutil.Process]:
    """listener PID から祖先を辿り、最初に ClipBox 判定を満たすプロセスを service root として返す。

    `uvicorn --reload` のように LISTEN するのが子・マーカーが親（reloader）の構成に対応する。
    """
    try:
        proc = psutil.Process(listener_pid)
    except psutil.Error:
        return None

    candidates: List[psutil.Process] = [proc]
    try:
        candidates.extend(proc.parents())
    except psutil.Error:
        pass

    for candidate in candidates:
        if _is_clipbox_process(candidate, spec):
            return candidate
    return None


def _is_clipbox_process(proc: psutil.Process, spec: RuntimeServiceSpec) -> bool:
    """cwd がリポジトリ配下 AND cmdline にサービス固有マーカーを含むなら ClipBox とみなす。"""
    try:
        cwd = proc.cwd()
        cmdline = " ".join(proc.cmdline()).lower()
    except (psutil.Error, OSError):
        return False

    if not _is_within_repo(cwd):
        return False
    return any(marker in cmdline for marker in spec.markers)


def _is_within_repo(path: str) -> bool:
    if not path:
        return False
    try:
        resolved = Path(path).resolve()
    except OSError:
        return False
    return resolved == REPO_ROOT or REPO_ROOT in resolved.parents


def _terminate_process_tree(root_pid: int) -> bool:
    try:
        root = psutil.Process(root_pid)
    except psutil.Error:
        return False

    processes = _collect_process_tree(root)
    if not processes:
        return False

    for proc in processes:
        try:
            proc.terminate()
        except psutil.Error:
            continue

    _gone, alive = psutil.wait_procs(processes, timeout=_TERMINATE_TIMEOUT_SECONDS)
    for proc in alive:
        try:
            proc.kill()
        except psutil.Error:
            continue

    if alive:
        psutil.wait_procs(alive, timeout=_TERMINATE_TIMEOUT_SECONDS)

    return True


def _collect_process_tree(root: psutil.Process) -> List[psutil.Process]:
    processes = [root]
    try:
        processes.extend(root.children(recursive=True))
    except psutil.Error:
        pass

    unique: Dict[int, psutil.Process] = {}
    for proc in processes:
        try:
            unique[proc.pid] = proc
        except psutil.Error:
            continue
    return list(unique.values())
