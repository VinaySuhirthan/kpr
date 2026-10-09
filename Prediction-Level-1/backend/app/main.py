from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analysis import router as analysis_router
from app.api.genome import router as genome_router
from app.api.health import router as health_router
from app.api.isolates import router as isolates_router
from app.api.predictions import router as predictions_router
from app.core.config import settings
from app.services.data_loader import load_ast_phenotypes, load_gene_annotations, load_isolate_genomics
from app.services.model_service import ensure_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_isolate_genomics()
    load_gene_annotations()
    load_ast_phenotypes()
    ensure_models()
    yield


app = FastAPI(title="AMR Intelligence", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(isolates_router)
app.include_router(predictions_router)
app.include_router(genome_router)
app.include_router(analysis_router)
