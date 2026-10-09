import csv
import io
import json
from pathlib import Path
from typing import Dict, List, Optional
from level3_app.config.settings import settings
from level3_app.schemas.amr_result import AmrDetectionResult
from level3_app.schemas.analysis import (
    AnalysisResponse,
    AnalysisSummary,
    AnalysisInputMetadata,
    AstConcordanceSummary,
    AstValidationItem
)
from level3_app.utils.logging import logger

# In-memory cache for fast lookup
_CACHE: Dict[str, AnalysisResponse] = {}

def save_analysis_response(response: AnalysisResponse) -> None:
    """
    Saves analysis response both in memory and to disk as JSON.
    """
    _CACHE[response.analysis_id] = response
    out_file = settings.RESULTS_DIR / f"{response.analysis_id}.json"
    try:
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(response.model_dump_json(indent=2))
        logger.info(f"Saved analysis results to {out_file}")
    except Exception as e:
        logger.error(f"Failed to write analysis result file {out_file}: {e}")

def get_analysis_response(analysis_id: str) -> Optional[AnalysisResponse]:
    """
    Retrieves analysis response from memory or disk.
    """
    if analysis_id in _CACHE:
        return _CACHE[analysis_id]

    file_path = settings.RESULTS_DIR / f"{analysis_id}.json"
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                resp = AnalysisResponse(**data)
                _CACHE[analysis_id] = resp
                return resp
        except Exception as e:
            logger.error(f"Failed to read analysis result file {file_path}: {e}")
            return None
    return None

def calculate_summary(
    results: List[AmrDetectionResult],
    total_sequences: int,
    total_contigs: int,
    total_isolates: int
) -> AnalysisSummary:
    """
    Calculates summary statistics strictly from actual results.
    Never uses hardcoded numbers.
    """
    total_amr_hits = len(results)
    unique_genes = len(set(r.gene for r in results))
    
    # Isolate count from results if sequence count not provided, else from total_isolates
    unique_hit_isolates = len(set(r.isolate_id for r in results))
    num_isolates = max(total_isolates, unique_hit_isolates)

    # Unique mechanisms detected
    unique_mechanisms = set()
    for r in results:
        if r.mechanism and r.mechanism.strip():
            unique_mechanisms.add(r.mechanism.strip())
        elif r.gene_class and r.gene_class.strip():
            unique_mechanisms.add(r.gene_class.strip())

    return AnalysisSummary(
        total_sequences=total_sequences,
        total_contigs=total_contigs,
        total_amr_hits=total_amr_hits,
        unique_genes=unique_genes,
        number_of_isolates=num_isolates,
        number_of_mechanisms=len(unique_mechanisms)
    )

def calculate_ast_concordance(
    results: List[AmrDetectionResult],
    all_isolates: List[str],
    ast_phenotype_map: Dict[str, str]
) -> Optional[AstConcordanceSummary]:
    """
    Evaluates Genotype vs Phenotype Concordance across all isolates.
    Validates whether detected AMR determinants match phenotypic susceptibility/resistance.
    Returns None if no AST data was provided in the input dataset.
    """
    if not ast_phenotype_map:
        return None

    # Group detected genes by isolate
    isolate_genes: Dict[str, List[str]] = {}
    for r in results:
        iso = r.isolate_id
        if iso not in isolate_genes:
            isolate_genes[iso] = []
        if r.gene and r.gene not in isolate_genes[iso]:
            isolate_genes[iso].append(r.gene)

    items: List[AstValidationItem] = []
    tp = 0  # True Positive: Genotype Resistant, Phenotype Resistant
    tn = 0  # True Negative: Genotype Susceptible, Phenotype Susceptible
    fp = 0  # False Positive: Genotype Resistant, Phenotype Susceptible (silent gene)
    fn = 0  # False Negative: Genotype Susceptible, Phenotype Resistant (unexplained resistance)

    # Process all isolates that have AST data
    unique_isolates = sorted(list(set(all_isolates).union(set(ast_phenotype_map.keys()))))

    for iso in unique_isolates:
        if iso not in ast_phenotype_map:
            continue

        phenotype = ast_phenotype_map[iso]
        genes = isolate_genes.get(iso, [])
        genotype_call = "Resistant" if len(genes) > 0 else "Susceptible"

        norm_phenotype = phenotype.capitalize()
        if norm_phenotype == "Resistant":
            if genotype_call == "Resistant":
                status = "MATCH"
                category = "True Positive (Concordant Resistant)"
                interpretation = f"Genotypic determinant ({', '.join(genes)}) aligns with phenotypic resistance."
                tp += 1
            else:
                status = "MISMATCH"
                category = "Major Discrepancy (Unexplained Phenotypic Resistance)"
                interpretation = "Bacterial sample is phenotypically resistant, but no AMRFinderPlus acquired AMR genes were detected. Potential novel mechanism, unmodeled point mutation, or efflux pump."
                fn += 1
        elif norm_phenotype == "Susceptible":
            if genotype_call == "Susceptible":
                status = "MATCH"
                category = "True Negative (Concordant Susceptible)"
                interpretation = "Absence of detected acquired AMR determinants matches phenotypic susceptibility."
                tn += 1
            else:
                status = "MISMATCH"
                category = "Minor Discrepancy (Silent / Unexpressed AMR Determinant)"
                interpretation = f"Carries {', '.join(genes)} in genomic sequence but tested phenotypically susceptible. Potential promoter mutation, truncated pseudogene, or in-vitro assay conditions."
                fp += 1
        else:  # Intermediate or custom
            if len(genes) > 0:
                status = "MATCH"
                category = "Intermediate Susceptibility (Genotype Positive)"
                interpretation = f"Intermediate MIC phenotype with detected resistance determinant ({', '.join(genes)})."
                tp += 1
            else:
                status = "MATCH"
                category = "Intermediate Susceptibility (Genotype Negative)"
                interpretation = "Intermediate MIC phenotype without acquired resistance determinants."
                tn += 1

        items.append(AstValidationItem(
            isolate_id=iso,
            ast_phenotype=phenotype,
            genotype_call=genotype_call,
            detected_genes=genes,
            status=status,
            category=category,
            interpretation=interpretation
        ))

    total = len(items)
    if total == 0:
        return None

    matches = sum(1 for it in items if it.status == "MATCH")
    mismatches = total - matches
    concordance_rate = round((matches / total) * 100.0, 1)

    sensitivity = round((tp / (tp + fn)) * 100.0, 1) if (tp + fn) > 0 else None
    specificity = round((tn / (tn + fp)) * 100.0, 1) if (tn + fp) > 0 else None

    return AstConcordanceSummary(
        total_evaluated=total,
        matches=matches,
        mismatches=mismatches,
        concordance_rate=concordance_rate,
        true_positives=tp,
        true_negatives=tn,
        false_positives=fp,
        false_negatives=fn,
        sensitivity=sensitivity,
        specificity=specificity,
        items=items
    )

def results_to_csv(results: List[AmrDetectionResult]) -> str:
    """
    Serializes AMR detection results to CSV format.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "analysis_id",
        "isolate_id",
        "contig_id",
        "gene",
        "gene_class",
        "method",
        "start",
        "end",
        "strand",
        "identity",
        "coverage",
        "mechanism"
    ])

    for r in results:
        writer.writerow([
            r.analysis_id,
            r.isolate_id,
            r.contig_id,
            r.gene,
            r.gene_class or "",
            r.method,
            r.start if r.start is not None else "",
            r.end if r.end is not None else "",
            r.strand or "",
            r.identity if r.identity is not None else "",
            r.coverage if r.coverage is not None else "",
            r.mechanism or ""
        ])

    return output.getvalue()
