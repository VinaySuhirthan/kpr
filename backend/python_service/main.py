from __future__ import annotations

import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

PROJECT_ROOT = Path(__file__).resolve().parents[2]

LEVEL1_DIR = PROJECT_ROOT / "Prediction-Level-1" / "backend"
LEVEL3_DIR = PROJECT_ROOT / "Forecast_I-Level-3" / "backend"
LEVEL4_DIR = PROJECT_ROOT / "Forecast_II-Level-4" / "backend"

import importlib.util

# Ensure Level 1 and Level 3 backend roots are in sys.path
for path_dir in [LEVEL3_DIR, LEVEL1_DIR]:
    path_str = str(path_dir)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

# Import Level 1 app components
from app.api.analysis import router as l1_analysis_router
from app.api.genome import router as l1_genome_router
from app.api.health import router as l1_health_router
from app.api.isolates import router as l1_isolates_router
from app.api.predictions import router as l1_predictions_router
from app.services.data_loader import load_ast_phenotypes, load_gene_annotations, load_isolate_genomics
from app.services.model_service import ensure_models

# Import Level 3 app components
from level3_app.api.routes_amr import router as l3_amr_router
from level3_app.api.routes_genome import router as l3_genome_router
from level3_app.api.routes_health import router as l3_health_router

# Import Level 4 FastAPI app module cleanly via importlib to avoid app.py collision
l4_spec = importlib.util.spec_from_file_location("level4_module", LEVEL4_DIR / "app.py")
l4_app_module = importlib.util.module_from_spec(l4_spec)
l4_spec.loader.exec_module(l4_app_module)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Level 1 datasets and models
    try:
        load_isolate_genomics()
        load_gene_annotations()
        load_ast_phenotypes()
        ensure_models()
        print("[Unified Backend] Level 1 ML Models & Genotypic Datasets Loaded.")
    except Exception as e:
        print(f"[Unified Backend Level 1 Warning]: {e}")
    yield

app = FastAPI(
    title="Unified AMR Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Level 1 URL Rewriter Middleware & Routes
# -------------------------------------------------------------------
@app.middleware("http")
async def level1_path_rewrite_middleware(request: Request, call_next):
    path = request.scope.get("path", "")
    if path.startswith("/api/level1"):
        sub = path[len("/api/level1"):]
        if sub == "/health" or sub == "/health/":
            request.scope["path"] = "/health"
        elif sub.startswith("/dashboard/"):
            request.scope["path"] = f"/api/v1/level1{sub}"
        elif sub.startswith("/api/v1/"):
            request.scope["path"] = sub
        else:
            request.scope["path"] = f"/api/v1{sub}"
    response = await call_next(request)
    return response

# Direct registration of Level 1 routers (contains /api/v1 prefix)
app.include_router(l1_health_router, tags=["Level 1 Health"])
app.include_router(l1_isolates_router, tags=["Level 1 Isolates"])
app.include_router(l1_predictions_router, tags=["Level 1 Predictions"])
app.include_router(l1_genome_router, tags=["Level 1 Genome"])
app.include_router(l1_analysis_router, tags=["Level 1 Analysis"])

# -------------------------------------------------------------------
# Level 3 Routes (Mounted under /api/level3)
# -------------------------------------------------------------------
app.include_router(l3_health_router, prefix="/api/level3", tags=["Level 3 Health"])
app.include_router(l3_amr_router, prefix="/api/level3", tags=["Level 3 AMR Detection"])
app.include_router(l3_genome_router, prefix="/api/level3", tags=["Level 3 Genome Explorer"])

# -------------------------------------------------------------------
# Level 4 Routes (Mounted under /api/level4)
# -------------------------------------------------------------------
app.include_router(l4_app_module.app.router, prefix="/api/level4", tags=["Level 4 Forecasting"])
app.include_router(l4_app_module.app.router, tags=["Level 4 Forecasting Root"])

@app.get("/api/health")
def unified_health():
    return {
        "status": "healthy",
        "service": "Unified AMR Intelligence Platform Backend",
        "levels": ["Level 1 (Prediction)", "Level 3 (Gene Detection)", "Level 4 (Forecasting)"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
