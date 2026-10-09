from __future__ import annotations

import shutil
import subprocess
import time
from typing import Any

from app.core.config import settings


def is_available() -> bool:
    return bool(settings.amrfinder_path and shutil.which(settings.amrfinder_path) or shutil.which("amrfinder"))


def run_amrfinder(fasta_path: str | None = None) -> dict[str, Any]:
    binary = settings.amrfinder_path or shutil.which("amrfinder")
    if not binary:
        return {"available": False, "message": "AMRFinderPlus is not installed/configured"}

    command = [binary]
    if fasta_path:
        command.extend(["--infile", fasta_path])

    started = time.time()
    result = subprocess.run(command, capture_output=True, text=True, shell=False)
    elapsed = time.time() - started

    return {
        "available": result.returncode == 0,
        "exit_code": result.returncode,
        "execution_time_seconds": round(elapsed, 3),
        "stdout": result.stdout,
        "stderr": result.stderr,
        "message": "AMRFinderPlus executed" if result.returncode == 0 else "AMRFinderPlus failed",
        "results": [],
    }
