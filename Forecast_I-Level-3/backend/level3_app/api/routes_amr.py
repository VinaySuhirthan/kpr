from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import JSONResponse

from level3_app.schemas.analysis import AnalysisResponse, ToolStatusResponse
from level3_app.services.amrfinder_runner import check_amrfinder_status
from level3_app.services.amrfinder_service import execute_amr_pipeline, AmrAnalysisError
from level3_app.services.result_service import get_analysis_response, results_to_csv
from level3_app.utils.logging import logger

router = APIRouter(prefix="/api/v1/amr", tags=["AMR Analysis"])

@router.get("/tool-status", response_model=ToolStatusResponse)
def get_tool_status():
    """
    Returns whether AMRFinderPlus is installed and executable in the current environment.
    """
    available, version, db_version, resolved_path, message = check_amrfinder_status()
    return ToolStatusResponse(
        available=available,
        version=version,
        database_version=db_version,
        executable_path=resolved_path,
        message=message
    )

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_amr(
    file: UploadFile = File(...),
    tool: str = Form("AMRFinderPlus"),
    organism: Optional[str] = Form(None),
    min_identity: Optional[float] = Form(None),
    min_coverage: Optional[float] = Form(None)
):
    """
    Accepts multipart upload of genomic CSV (or FASTA).
    Executes real AMRFinderPlus pipeline and returns AMR gene annotations.
    """
    try:
        content = await file.read()
        filename = file.filename or "upload.csv"
        
        response = execute_amr_pipeline(
            file_bytes=content,
            filename=filename,
            tool=tool,
            organism=organism,
            min_identity=min_identity,
            min_coverage=min_coverage
        )
        return response
    except AmrAnalysisError as aae:
        raise HTTPException(status_code=aae.status_code, detail=aae.message)
    except Exception as e:
        logger.error(f"Unexpected server error during AMR analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error during analysis: {str(e)}")

@router.get("/results/{analysis_id}", response_model=AnalysisResponse)
def get_results(analysis_id: str):
    """
    Retrieves previous analysis results by analysis_id.
    """
    resp = get_analysis_response(analysis_id)
    if not resp:
        raise HTTPException(status_code=404, detail=f"Analysis results for '{analysis_id}' not found.")
    return resp

@router.get("/results/{analysis_id}/csv")
def download_results_csv(analysis_id: str):
    """
    Downloads analysis results as CSV file.
    """
    resp = get_analysis_response(analysis_id)
    if not resp:
        raise HTTPException(status_code=404, detail=f"Analysis results for '{analysis_id}' not found.")

    csv_data = results_to_csv(resp.results)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=amr_results_{analysis_id}.csv"}
    )

@router.get("/results/{analysis_id}/json")
def download_results_json(analysis_id: str):
    """
    Downloads analysis results as JSON file.
    """
    resp = get_analysis_response(analysis_id)
    if not resp:
        raise HTTPException(status_code=404, detail=f"Analysis results for '{analysis_id}' not found.")

    return JSONResponse(
        content=resp.model_dump(),
        headers={"Content-Disposition": f"attachment; filename=amr_results_{analysis_id}.json"}
    )
