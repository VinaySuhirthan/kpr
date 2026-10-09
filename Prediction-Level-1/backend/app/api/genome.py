from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile

from app.services.amrfinder_service import run_amrfinder
from app.services.genomic_service import parse_fasta_text
from app.services.rgi_service import run_rgi

router = APIRouter(prefix="/api/v1")


@router.post("/genome/parse")
async def parse_genome(file: UploadFile):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No FASTA file uploaded")

    contents = await file.read()
    try:
        payload = parse_fasta_text(contents.decode("utf-8"))
        return {"analysis_mode": "genome", **payload}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/genome/analyze")
async def analyze_genome(file: UploadFile):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No FASTA file uploaded")

    contents = await file.read()
    try:
        parsed = parse_fasta_text(contents.decode("utf-8"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "analysis_mode": "genome",
        "parsed": parsed,
        "amrfinder": run_amrfinder(),
        "rgi": run_rgi(),
    }
