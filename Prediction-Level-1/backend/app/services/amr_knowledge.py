from __future__ import annotations

GENE_TO_CLASS = {
    "blaCTX-M": "beta-lactam resistance",
    "blaTEM": "beta-lactam resistance",
    "blaKPC": "carbapenem resistance",
    "blaNDM": "carbapenem resistance",
    "blaSHV": "beta-lactam resistance",
    "mecA": "methicillin resistance",
    "ermC": "macrolide resistance",
    "tetM": "tetracycline resistance",
    "blaZ": "beta-lactam resistance",
    "tetA": "tetracycline resistance",
    "qnrS": "fluoroquinolone resistance",
    "sul1": "sulfonamide resistance",
    "aac(6')-Ib": "aminoglycoside resistance",
    "dfrA": "trimethoprim resistance",
}

MUTATION_TO_CLASS = {
    "gyrA_S83L": "fluoroquinolone resistance",
    "parC_S80I": "fluoroquinolone resistance",
    "gyrA_T83I": "fluoroquinolone resistance",
    "grlA_S80F": "fluoroquinolone resistance",
}

GENE_DESCRIPTION = {
    "blaCTX-M": "extended-spectrum beta-lactamase",
    "blaTEM": "beta-lactamase",
    "blaKPC": "KPC carbapenemase",
    "blaNDM": "NDM carbapenemase",
    "blaSHV": "SHV beta-lactamase",
    "mecA": "methicillin resistance determinant",
    "ermC": "erythromycin ribosomal methylase",
    "tetM": "tetracycline resistance determinant",
    "blaZ": "beta-lactamase Z",
    "tetA": "tetracycline efflux pump",
    "qnrS": "quinolone resistance protein",
    "sul1": "sulfonamide resistance gene",
    "aac(6')-Ib": "aminoglycoside acetyltransferase",
    "dfrA": "trimethoprim-resistant dihydrofolate reductase",
    "gyrA_S83L": "fluoroquinolone resistance mutation",
    "parC_S80I": "fluoroquinolone resistance mutation",
    "gyrA_T83I": "fluoroquinolone resistance mutation",
    "grlA_S80F": "fluoroquinolone resistance mutation",
}

ANTIBIOTIC_CLASS_MAP = {
    "Ampicillin": "Penicillins",
    "Ceftriaxone": "Cephalosporins",
    "Cefazolin": "Cephalosporins",
    "Cefepime": "Cephalosporins",
    "Ceftazidime": "Cephalosporins",
    "Meropenem": "Carbapenems",
    "Erythromycin": "Macrolides",
    "Clindamycin": "Lincosamides",
    "Tetracycline": "Tetracyclines",
    "Gentamicin": "Aminoglycosides",
    "Tobramycin": "Aminoglycosides",
    "Vancomycin": "Glycopeptides",
    "Trimethoprim-Sulfamethoxazole": "Sulfonamides",
    "Piperacillin-Tazobactam": "Penicillins",
    "Aztreonam": "Monobactams",
    "Ciprofloxacin": "Fluoroquinolones",
    "Oxacillin": "Penicillins",
}

ANTIBIOTIC_RELEVANT_GENES = {
    "Ampicillin": ["blaTEM", "blaCTX-M", "blaSHV", "blaZ", "mecA"],
    "Ceftriaxone": ["blaCTX-M", "blaTEM", "blaSHV", "blaKPC"],
    "Cefazolin": ["blaCTX-M", "blaTEM", "blaSHV", "blaZ", "mecA"],
    "Cefepime": ["blaCTX-M", "blaTEM", "blaKPC", "blaNDM"],
    "Ceftazidime": ["blaCTX-M", "blaTEM", "blaSHV", "blaKPC"],
    "Meropenem": ["blaKPC", "blaNDM", "blaCTX-M", "blaTEM"],
    "Ciprofloxacin": ["gyrA_S83L", "parC_S80I", "gyrA_T83I", "grlA_S80F", "qnrS"],
    "Gentamicin": ["aac(6')-Ib", "armA"],
    "Tobramycin": ["aac(6')-Ib", "armA"],
    "Erythromycin": ["ermC"],
    "Clindamycin": ["ermC"],
    "Tetracycline": ["tetA", "tetM"],
    "Trimethoprim-Sulfamethoxazole": ["sul1", "dfrA"],
    "Vancomycin": ["vanA", "vanB"],
    "Piperacillin-Tazobactam": ["blaKPC", "blaCTX-M", "blaTEM", "blaSHV"],
    "Aztreonam": ["blaCTX-M", "blaTEM", "blaSHV"],
    "Oxacillin": ["mecA", "blaZ"],
}


def normalize_key(value: str | None) -> str:
    if not value:
        return ""
    return value.strip().replace(" ", "_").replace("-", "_").replace("/", "_")


def get_gene_association(gene: str) -> dict:
    lookup = normalize_key(gene)
    for key, value in GENE_TO_CLASS.items():
        if normalize_key(key) == lookup:
            return {"gene": key, "class": value, "description": GENE_DESCRIPTION.get(key, "")}
    return {"gene": gene, "class": "genomic feature", "description": ""}


def get_mutation_association(mutation: str) -> dict:
    lookup = normalize_key(mutation)
    for key, value in MUTATION_TO_CLASS.items():
        if normalize_key(key) == lookup:
            return {"gene": key.split("_")[0], "mutation": key.split("_", 1)[1], "class": value, "description": GENE_DESCRIPTION.get(key, "")}
    return {"gene": mutation, "mutation": mutation, "class": "genomic feature", "description": ""}
