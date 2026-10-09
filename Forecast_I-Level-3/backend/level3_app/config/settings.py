import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "AMR Genomics Platform - Level 1"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # AMRFinderPlus Configuration
    AMRFINDERPLUS_PATH: str = os.getenv("AMRFINDERPLUS_PATH", "amrfinder")
    AMRFINDERPLUS_DB: str | None = os.getenv("AMRFINDERPLUS_DB", None)

    # File uploads and paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    RESULTS_DIR: Path = BASE_DIR / "results"

    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    MIN_SEQUENCE_LENGTH: int = 50  # AMRFinderPlus requires meaningful genomic sequence length
    
    ALLOWED_EXTENSIONS: set[str] = {".csv", ".fasta", ".fa", ".fna"}

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
