import re
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Generator
from level3_app.utils.logging import logger

def sanitize_filename(filename: str) -> str:
    """
    Remove potentially dangerous characters from user-provided filename.
    """
    # Keep only alphanumeric, underscores, hyphens, and periods
    clean = re.sub(r"[^\w\.-]", "_", filename.strip())
    # Prevent directory traversal
    clean = Path(clean).name
    return clean or "uploaded_file"

@contextmanager
def safe_temp_dir(prefix: str = "amr_run_") -> Generator[Path, None, None]:
    """
    Creates a temporary directory for pipeline execution and guarantees cleanup.
    """
    temp_dir = Path(tempfile.mkdtemp(prefix=prefix))
    logger.info(f"Created temporary directory: {temp_dir}")
    try:
        yield temp_dir
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info(f"Cleaned up temporary directory: {temp_dir}")
        except Exception as e:
            logger.warning(f"Failed to clean up temp dir {temp_dir}: {e}")
