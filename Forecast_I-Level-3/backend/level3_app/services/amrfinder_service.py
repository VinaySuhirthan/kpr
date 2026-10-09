import uuid
from pathlib import Path
from typing import Optional
from level3_app.config.settings import settings
from level3_app.schemas.analysis import AnalysisResponse, AnalysisInputMetadata
from level3_app.services.amrfinder_runner import run_amrfinder, check_amrfinder_status, AmrFinderNotFoundError, AmrFinderExecutionError
from level3_app.services.amrfinder_parser import parse_amrfinder_tsv
from level3_app.services.csv_parser import parse_genomic_csv, CsvParseError
from level3_app.services.fasta_parser import parse_genomic_fasta, FastaParseError
from level3_app.services.result_service import calculate_summary, calculate_ast_concordance, save_analysis_response
from level3_app.services.visualization_service import build_visualization_tracks
from level3_app.utils.logging import logger

class AmrAnalysisError(Exception):
    """General error raised during AMR analysis pipeline."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

def execute_amr_pipeline(
    file_bytes: bytes,
    filename: str,
    tool: str = "AMRFinderPlus",
    organism: Optional[str] = None,
    min_identity: Optional[float] = None,
    min_coverage: Optional[float] = None
) -> AnalysisResponse:
    """
    Executes the complete Level 1 AMR Gene Detection pipeline.
    Validates input -> Parses sequences -> Runs AMRFinderPlus -> Parses real TSV -> Builds response.
    """
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise AmrAnalysisError(
            f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
            status_code=413
        )

    file_ext = Path(filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise AmrAnalysisError(
            f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}",
            status_code=400
        )

    analysis_id = f"amr_{uuid.uuid4().hex[:12]}"
    logger.info(f"Starting AMR analysis {analysis_id} for {filename} (tool={tool}, organism={organism})")

    # 1. Parse genomic input
    ast_phenotype_map = {}
    if file_ext == ".csv":
        try:
            csv_res = parse_genomic_csv(file_bytes, filename=filename)
            records, fasta_id_map = csv_res
            ast_phenotype_map = getattr(csv_res, "ast_phenotype_map", {})
            input_format = "csv"
        except CsvParseError as cpe:
            raise AmrAnalysisError(str(cpe), status_code=400)
    elif file_ext in {".fasta", ".fa", ".fna"}:
        try:
            records, fasta_id_map = parse_genomic_fasta(file_bytes)
            input_format = "fasta"
        except FastaParseError as fpe:
            raise AmrAnalysisError(str(fpe), status_code=400)
    else:
        raise AmrAnalysisError(f"Unsupported file extension: {file_ext}", status_code=400)

    total_sequences = len(records)
    unique_contigs = len(set((r.isolate_id, r.contig_id) for r in records))
    unique_isolates = len(set(r.isolate_id for r in records))

    # 2. Check AMRFinder availability
    is_avail, _, _, _, err_msg = check_amrfinder_status()
    if not is_avail:
        raise AmrAnalysisError(
            err_msg or "AMRFinderPlus executable is not available in the current environment.",
            status_code=503
        )

    # 3. Execute AMRFinderPlus
    try:
        raw_tsv_output = run_amrfinder(
            records=records,
            organism=organism
        )
    except AmrFinderNotFoundError as nf:
        raise AmrAnalysisError(str(nf), status_code=503)
    except AmrFinderExecutionError as ee:
        raise AmrAnalysisError(str(ee), status_code=500)
    except Exception as e:
        logger.error(f"Unexpected error running AMRFinderPlus: {e}", exc_info=True)
        raise AmrAnalysisError(f"AMRFinderPlus processing failed: {str(e)}", status_code=500)

    # 4. Parse real output
    results = parse_amrfinder_tsv(
        tsv_content=raw_tsv_output,
        analysis_id=analysis_id,
        fasta_id_map=fasta_id_map,
        min_identity=min_identity,
        min_coverage=min_coverage
    )

    # 5. Build visualization tracks
    tracks = build_visualization_tracks(results, fasta_id_map)

    # 6. Calculate summary & AST phenotype concordance
    summary = calculate_summary(
        results=results,
        total_sequences=total_sequences,
        total_contigs=unique_contigs,
        total_isolates=unique_isolates
    )

    all_isolate_ids = list(set(r.isolate_id for r in records))
    ast_concordance = calculate_ast_concordance(
        results=results,
        all_isolates=all_isolate_ids,
        ast_phenotype_map=ast_phenotype_map
    )

    input_meta = AnalysisInputMetadata(
        filename=filename,
        format=input_format,
        sequences=total_sequences,
        isolates=unique_isolates
    )

    response = AnalysisResponse(
        status="success",
        analysis_id=analysis_id,
        input=input_meta,
        summary=summary,
        results=results,
        visualization_tracks=tracks,
        ast_concordance=ast_concordance,
        message=None if results else "No AMR determinants matching the current AMRFinderPlus database/settings were detected."
    )

    # 7. Cache & Save
    save_analysis_response(response)
    return response
