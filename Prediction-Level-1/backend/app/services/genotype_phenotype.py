from __future__ import annotations

from app.services.amr_knowledge import ANTIBIOTIC_CLASS_MAP, ANTIBIOTIC_RELEVANT_GENES
from app.services.data_loader import get_ast, get_genes, get_isolate, parse_mutations


def _mutation_names(isolate_id: str) -> list[str]:
    isolate = get_isolate(isolate_id)
    if not isolate:
        return []
    return parse_mutations(str(isolate.get("resistance_mutations") or ""))


def _matched_evidence_for_antibiotic(isolate_id: str, antibiotic: str) -> list[str]:
    relevant = ANTIBIOTIC_RELEVANT_GENES.get(antibiotic, [])
    genes = [item["gene"] for item in get_genes(isolate_id)]
    mutations = _mutation_names(isolate_id)
    evidence = []
    for candidate in relevant:
        if candidate in genes:
            evidence.append(candidate)
        if candidate in mutations:
            evidence.append(candidate)
    return sorted(set(evidence))


def compare_isolate(isolate_id: str) -> dict:
    ast_results = get_ast(isolate_id)
    items = []
    matches = 0
    possible_mismatches = 0
    no_genetic_evidence = 0

    for entry in ast_results:
        antibiotic = entry["antibiotic"]
        ast_result = entry["result"]
        evidence = _matched_evidence_for_antibiotic(isolate_id, antibiotic)
        if ast_result == "I":
            interpretation = "INCONCLUSIVE"
        elif ast_result == "R" and evidence:
            interpretation = "CONSISTENT"
            matches += 1
        elif ast_result == "S" and not evidence:
            interpretation = "NO_GENETIC_EVIDENCE"
            no_genetic_evidence += 1
        elif ast_result == "R" and not evidence:
            interpretation = "POSSIBLE_MISMATCH"
            possible_mismatches += 1
        elif ast_result == "S" and evidence:
            interpretation = "POSSIBLE_MISMATCH"
            possible_mismatches += 1
        else:
            interpretation = "INCONCLUSIVE"

        items.append({
            "antibiotic": antibiotic,
            "antibiotic_class": ANTIBIOTIC_CLASS_MAP.get(antibiotic, "Unclassified"),
            "genetic_evidence": evidence,
            "ast_result": ast_result,
            "interpretation": interpretation,
        })

    if not ast_results:
        overall_status = "NO_PHENOTYPE"
    elif possible_mismatches:
        overall_status = "POSSIBLE_MISMATCH"
    elif matches > 0 and no_genetic_evidence == 0:
        overall_status = "CONSISTENT"
    elif no_genetic_evidence and matches == 0:
        overall_status = "NO_GENETIC_EVIDENCE"
    else:
        overall_status = "INCONCLUSIVE"

    return {
        "overall_status": overall_status,
        "matches": matches,
        "possible_mismatches": possible_mismatches,
        "no_genetic_evidence": no_genetic_evidence,
        "items": items,
    }
