import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple
from level3_app.utils.logging import logger

def is_executable_available(executable_name_or_path: str) -> Tuple[bool, Optional[str]]:
    """
    Checks if the command/executable is available in PATH or at the specified absolute path.
    Returns (True, resolved_path) or (False, None).
    """
    # Check direct path
    p = Path(executable_name_or_path)
    if p.is_file():
        return True, str(p.resolve())

    # Check which
    found = shutil.which(executable_name_or_path)
    if found:
        return True, str(Path(found).resolve())

    return False, None

def run_command_safely(
    cmd_args: List[str],
    timeout_seconds: int = 300,
    cwd: Optional[Path] = None
) -> Tuple[int, str, str]:
    """
    Executes a subprocess command without shell=True to avoid injection risks.
    Returns (return_code, stdout, stderr).
    """
    logger.info(f"Executing command: {' '.join(cmd_args)}")
    try:
        result = subprocess.run(
            cmd_args,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_seconds,
            cwd=str(cwd) if cwd else None
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        logger.error(f"Command timed out after {timeout_seconds} seconds: {' '.join(cmd_args)}")
        return -1, "", f"Execution timed out after {timeout_seconds} seconds"
    except Exception as e:
        logger.error(f"Failed to execute command: {e}")
        return -1, "", str(e)
