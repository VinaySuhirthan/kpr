import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.data_dir = os.getenv("DATA_DIR", "./data")
        self.model_dir = os.getenv("MODEL_DIR", "./models")
        self.fasta_dir = os.getenv("FASTA_DIR", "./genome_data/fasta")
        self.amrfinder_path = os.getenv("AMRFINDER_PATH", "")
        self.amrfinder_db_path = os.getenv("AMRFINDER_DB_PATH", "")
        self.rgi_path = os.getenv("RGI_PATH", "")
        self.card_db_path = os.getenv("CARD_DB_PATH", "")
        self.min_training_samples = int(os.getenv("MIN_TRAINING_SAMPLES", "30"))
        self.frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
        self.api_host = os.getenv("API_HOST", "127.0.0.1")
        self.api_port = int(os.getenv("API_PORT", "8000"))

        self.project_root = Path(__file__).resolve().parents[1]
        self.data_path = (self.project_root / self.data_dir).resolve() if not Path(self.data_dir).is_absolute() else Path(self.data_dir)
        self.model_path = (self.project_root / self.model_dir).resolve() if not Path(self.model_dir).is_absolute() else Path(self.model_dir)
        self.fasta_path = (self.project_root / self.fasta_dir).resolve() if not Path(self.fasta_dir).is_absolute() else Path(self.fasta_dir)


settings = Settings()
