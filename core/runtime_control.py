from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Literal

import psutil

RuntimeStatus = Literal["running", "stopped", "unknown"]


@dataclass(frozen=True)
class RuntimeServiceSpec:
    name: str
    label: str
    port: int


@dataclass(frozen=True)
class RuntimeServiceState:
    name: str
    label: str
    port: int
    status: RuntimeStatus
    pid: int | None = None


SERVICE_SPECS: Dict[str, RuntimeServiceSpec] = {
    "streamlit": RuntimeServiceSpec(name="streamlit", label="Streamlit", port=8501),
    "fastapi": RuntimeServiceSpec(name="fastapi", label="FastAPI", port=8000),
    "nextjs": RuntimeServiceSpec(name="nextjs", label="Next.js", port=3000),
}

_LISTEN_STATES = {psutil.CONN_LISTEN}
_TERMINATE_TIMEOUT_SECONDS = 3.0


def get_service_spec(service_name: str) -> RuntimeServiceSpec:
    try:
        return SERVICE_SPECS[service_name]
    except KeyError as exc:
        raise ValueError(f"unknown runtime service: {service_name}") from exc


def get_runtime_states() -> List[RuntimeServiceState]:
    states: List[RuntimeServiceState] = []
    for spec in SERVICE_SPECS.values():
        states.append(_get_runtime_state(spec))
    return states


def stop_service(service_name: str) -> Dict[str, str]:
    spec = get_service_spec(service_name)
    pids = _get_listener_pids(spec.port)
    if not pids:
        return {
            "status": "success",
            "message": f"{spec.label} は既に停止しています。",
        }

    stopped_any = False
    for pid in pids:
        stopped_any = _terminate_process_tree(pid) or stopped_any

    if not stopped_any:
        return {
            "status": "error",
            "message": f"{spec.label} を停止できませんでした。",
        }

    if _get_listener_pids(spec.port):
        return {
            "status": "error",
            "message": f"{spec.label} の停止後もポート {spec.port} が開いたままです。",
        }

    return {
        "status": "success",
        "message": f"{spec.label} を停止しました。",
    }


def _get_runtime_state(spec: RuntimeServiceSpec) -> RuntimeServiceState:
    try:
        pids = _get_listener_pids(spec.port)
    except (psutil.Error, OSError):
        return RuntimeServiceState(
            name=spec.name,
            label=spec.label,
            port=spec.port,
            status="unknown",
        )

    if not pids:
        return RuntimeServiceState(
            name=spec.name,
            label=spec.label,
            port=spec.port,
            status="stopped",
        )

    return RuntimeServiceState(
        name=spec.name,
        label=spec.label,
        port=spec.port,
        status="running",
        pid=sorted(pids)[0],
    )


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
