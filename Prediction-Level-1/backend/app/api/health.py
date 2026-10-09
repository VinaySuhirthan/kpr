from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root() -> dict:
    return {"message": "AMR Intelligence Level 1 API", "status": "ok"}


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "amr-intelligence", "analysis_mode": "dataset"}
