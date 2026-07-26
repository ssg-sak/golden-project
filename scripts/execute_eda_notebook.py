from __future__ import annotations

import json
import os
import secrets
import tempfile
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOK_PATH = PROJECT_ROOT / "analysis" / "golden_governance_eda.ipynb"
EXECUTION_TIMEOUT_SECONDS = 180


def _execute_with_nbclient() -> dict[str, Any] | None:
    try:
        import nbformat
        from nbclient import NotebookClient
    except ModuleNotFoundError:
        return None

    notebook = nbformat.read(NOTEBOOK_PATH, as_version=4)
    client = NotebookClient(
        notebook,
        timeout=EXECUTION_TIMEOUT_SECONDS,
        kernel_name="python3",
        allow_errors=False,
        record_timing=False,
        resources={"metadata": {"path": str(PROJECT_ROOT)}},
    )
    executed_notebook = client.execute()
    nbformat.validate(executed_notebook)
    nbformat.write(executed_notebook, NOTEBOOK_PATH)
    return dict(executed_notebook)


def _output_from_message(message_type: str, content: dict[str, Any]) -> dict[str, Any] | None:
    if message_type == "stream":
        return {
            "output_type": "stream",
            "name": content["name"],
            "text": content["text"],
        }
    if message_type in {"display_data", "execute_result"}:
        output: dict[str, Any] = {
            "output_type": message_type,
            "data": content.get("data", {}),
            "metadata": content.get("metadata", {}),
        }
        if message_type == "execute_result":
            output["execution_count"] = content.get("execution_count")
        return output
    if message_type == "error":
        return {
            "output_type": "error",
            "ename": content.get("ename", "ExecutionError"),
            "evalue": content.get("evalue", ""),
            "traceback": content.get("traceback", []),
        }
    return None


def _execute_with_kernel_protocol() -> dict[str, Any]:
    from jupyter_client import KernelManager

    notebook = json.loads(NOTEBOOK_PATH.read_text(encoding="utf-8"))
    manager = KernelManager(kernel_name="python3")
    manager.session.key = secrets.token_hex(32).encode("ascii")
    with tempfile.TemporaryDirectory(prefix="golden-eda-ipython-") as ipython_dir:
        kernel_environment = {
            **os.environ,
            "IPYTHONDIR": ipython_dir,
            "JUPYTER_CONFIG_DIR": ipython_dir,
        }
        manager.start_kernel(
            cwd=str(PROJECT_ROOT),
            env=kernel_environment,
        )
        client = manager.client()
        client.start_channels()
        try:
            client.wait_for_ready(timeout=EXECUTION_TIMEOUT_SECONDS)
            for cell in notebook["cells"]:
                if cell.get("cell_type") != "code":
                    continue
                source = "".join(cell.get("source", []))
                message_id = client.execute(
                    source,
                    allow_stdin=False,
                    stop_on_error=True,
                )
                outputs: list[dict[str, Any]] = []
                execution_count: int | None = None
                while True:
                    message = client.get_iopub_msg(
                        timeout=EXECUTION_TIMEOUT_SECONDS
                    )
                    if message.get("parent_header", {}).get("msg_id") != message_id:
                        continue
                    message_type = message["header"]["msg_type"]
                    content = message["content"]
                    if message_type == "execute_input":
                        execution_count = content.get("execution_count")
                    elif message_type == "clear_output":
                        outputs = []
                    else:
                        output = _output_from_message(message_type, content)
                        if output is not None:
                            outputs.append(output)
                    if message_type == "error":
                        traceback = "\n".join(content.get("traceback", []))
                        raise RuntimeError(
                            f"EDA 노트북 코드 셀 실행 실패:\n{traceback}"
                        )
                    if (
                        message_type == "status"
                        and content.get("execution_state") == "idle"
                    ):
                        break
                cell["execution_count"] = execution_count
                cell["outputs"] = outputs
        finally:
            client.stop_channels()
            manager.shutdown_kernel(now=True)

    NOTEBOOK_PATH.write_text(
        json.dumps(notebook, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return notebook


def _validate_execution(notebook: dict[str, Any]) -> tuple[int, int]:
    code_cells = [
        cell for cell in notebook["cells"] if cell.get("cell_type") == "code"
    ]
    executed_cells = sum(
        cell.get("execution_count") is not None for cell in code_cells
    )
    output_cells = sum(bool(cell.get("outputs")) for cell in code_cells)
    if executed_cells != len(code_cells) or output_cells != len(code_cells):
        raise RuntimeError(
            "노트북의 모든 코드 셀이 실행 결과를 남기지 못했습니다."
        )
    return executed_cells, output_cells


def main() -> None:
    notebook = _execute_with_nbclient() or _execute_with_kernel_protocol()
    executed_cells, output_cells = _validate_execution(notebook)
    print(
        "EDA notebook executed successfully: "
        f"{executed_cells} code cells, {output_cells} cells with outputs."
    )


if __name__ == "__main__":
    main()
