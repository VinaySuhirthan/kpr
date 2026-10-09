from pathlib import Path
import pandas as pd
import numpy as np
from itertools import combinations
import sys


# ============================================================
# STEP 3
# SAME-ISOLATE ANTIBIOTIC RELATIONSHIP ANALYSIS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "isolate_antibiotic_matrix_generated.csv"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
)

OUTPUT_FILE = (
    OUTPUT_DIR
    / "same_isolate_antibiotic_relationships.csv"
)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def calculate_phi(a, b):
    """
    Phi coefficient for two binary variables.

    a and b contain:
        1 = Resistant
        0 = Susceptible
        NaN = Intermediate / not tested
    """

    valid = pd.concat(
        [a, b],
        axis=1
    ).dropna()

    if len(valid) == 0:
        return np.nan

    a_values = valid.iloc[:, 0]
    b_values = valid.iloc[:, 1]

    n11 = ((a_values == 1) & (b_values == 1)).sum()
    n10 = ((a_values == 1) & (b_values == 0)).sum()
    n01 = ((a_values == 0) & (b_values == 1)).sum()
    n00 = ((a_values == 0) & (b_values == 0)).sum()

    denominator = np.sqrt(
        (n11 + n10)
        * (n01 + n00)
        * (n11 + n01)
        * (n10 + n00)
    )

    if denominator == 0:
        return np.nan

    return (
        (n11 * n00) - (n10 * n01)
    ) / denominator


def analyze_pair(df, antibiotic_a, antibiotic_b):
    """
    Calculate relationship metrics for one antibiotic pair.
    """

    a = df[antibiotic_a]
    b = df[antibiotic_b]

    # Only isolates where both antibiotics have
    # valid S/R results.
    valid = pd.concat(
        [a, b],
        axis=1
    ).dropna()

    if len(valid) == 0:
        return None

    a_values = valid.iloc[:, 0]
    b_values = valid.iloc[:, 1]

    # --------------------------------------------------------
    # Counts
    # --------------------------------------------------------

    n_both_tested = len(valid)

    a_resistant = int(
        (a_values == 1).sum()
    )

    b_resistant = int(
        (b_values == 1).sum()
    )

    both_resistant = int(
        (
            (a_values == 1)
            &
            (b_values == 1)
        ).sum()
    )

    a_resistant_b_susceptible = int(
        (
            (a_values == 1)
            &
            (b_values == 0)
        ).sum()
    )

    a_susceptible_b_resistant = int(
        (
            (a_values == 0)
            &
            (b_values == 1)
        ).sum()
    )

    both_susceptible = int(
        (
            (a_values == 0)
            &
            (b_values == 0)
        ).sum()
    )

    # --------------------------------------------------------
    # Conditional probability
    # --------------------------------------------------------

    # P(B resistant | A resistant)

    if a_resistant > 0:
        p_b_res_given_a_res = (
            both_resistant
            / a_resistant
        )
    else:
        p_b_res_given_a_res = np.nan

    # P(B resistant | A susceptible)

    a_susceptible = int(
        (a_values == 0).sum()
    )

    if a_susceptible > 0:
        p_b_res_given_a_sus = (
            a_susceptible_b_resistant
            / a_susceptible
        )
    else:
        p_b_res_given_a_sus = np.nan

    # --------------------------------------------------------
    # Risk ratio
    # --------------------------------------------------------

    if (
        pd.notna(p_b_res_given_a_res)
        and pd.notna(p_b_res_given_a_sus)
        and p_b_res_given_a_sus > 0
    ):
        risk_ratio = (
            p_b_res_given_a_res
            / p_b_res_given_a_sus
        )
    else:
        risk_ratio = np.nan

    # --------------------------------------------------------
    # Jaccard similarity
    # --------------------------------------------------------

    union_resistant = (
        a_resistant
        + b_resistant
        - both_resistant
    )

    if union_resistant > 0:
        jaccard = (
            both_resistant
            / union_resistant
        )
    else:
        jaccard = np.nan

    # --------------------------------------------------------
    # Phi correlation
    # --------------------------------------------------------

    phi = calculate_phi(
        a,
        b
    )

    # --------------------------------------------------------
    # Relationship strength
    # --------------------------------------------------------

    # This is a simple prototype score.
    #
    # We primarily use:
    #   phi
    #   conditional probability
    #
    # It is NOT a causal score.

    if pd.notna(phi):
        relationship_strength = abs(phi)
    else:
        relationship_strength = np.nan

    return {
        "antibiotic_a": antibiotic_a,
        "antibiotic_b": antibiotic_b,

        "n_both_tested": n_both_tested,

        "a_resistant": a_resistant,
        "b_resistant": b_resistant,

        "both_resistant": both_resistant,

        "a_resistant_b_susceptible":
            a_resistant_b_susceptible,

        "a_susceptible_b_resistant":
            a_susceptible_b_resistant,

        "both_susceptible":
            both_susceptible,

        "p_b_res_given_a_res":
            p_b_res_given_a_res,

        "p_b_res_given_a_sus":
            p_b_res_given_a_sus,

        "risk_ratio":
            risk_ratio,

        "jaccard_resistance":
            jaccard,

        "phi_correlation":
            phi,

        "relationship_strength":
            relationship_strength,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("STEP 3 - SAME-ISOLATE ANTIBIOTIC RELATIONSHIP ANALYSIS")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Check input
    # --------------------------------------------------------

    print("\n[1/6] Checking input dataset...")

    if not INPUT_FILE.exists():

        print("\nERROR: Input file not found:")
        print(INPUT_FILE)

        print("\nRun Step 2 first.")

        sys.exit(1)

    print("Input file found.")


    # --------------------------------------------------------
    # 2. Load matrix
    # --------------------------------------------------------

    print("\n[2/6] Loading isolate-antibiotic matrix...")

    df = pd.read_csv(
        INPUT_FILE
    )

    print(
        f"Rows loaded    : {len(df):,}"
    )

    print(
        f"Columns loaded : {len(df.columns):,}"
    )


    # --------------------------------------------------------
    # 3. Find antibiotics
    # --------------------------------------------------------

    print("\n[3/6] Detecting antibiotics...")

    metadata_columns = [
        "isolate_id",
        "collection_date",
        "organism",
        "ward",
        "specimen_type",
        "hospital_id",
    ]

    antibiotics = [
        column
        for column in df.columns
        if column not in metadata_columns
    ]

    print(
        f"Antibiotics detected: {len(antibiotics)}"
    )

    for antibiotic in antibiotics:
        print(f"  - {antibiotic}")


    # --------------------------------------------------------
    # 4. Generate pairwise relationships
    # --------------------------------------------------------

    print("\n[4/6] Calculating antibiotic relationships...")

    results = []

    total_pairs = (
        len(antibiotics)
        * (len(antibiotics) - 1)
        // 2
    )

    print(
        f"Total unique pairs: {total_pairs}"
    )

    pair_number = 0

    for antibiotic_a, antibiotic_b in combinations(
        antibiotics,
        2
    ):

        pair_number += 1

        result = analyze_pair(
            df,
            antibiotic_a,
            antibiotic_b
        )

        if result is not None:
            results.append(result)

        print(
            f"  [{pair_number}/{total_pairs}] "
            f"{antibiotic_a} <-> {antibiotic_b}"
        )


    relationships = pd.DataFrame(
        results
    )


    # --------------------------------------------------------
    # 5. Rank relationships
    # --------------------------------------------------------

    print("\n[5/6] Ranking relationships...")

    if len(relationships) > 0:

        relationships = relationships.sort_values(
            by=[
                "relationship_strength",
                "both_resistant"
            ],
            ascending=[
                False,
                False
            ]
        ).reset_index(drop=True)

        relationships.insert(
            0,
            "relationship_rank",
            range(
                1,
                len(relationships) + 1
            )
        )

    # Save
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    relationships.to_csv(
        OUTPUT_FILE,
        index=False
    )


    # --------------------------------------------------------
    # 6. Results
    # --------------------------------------------------------

    print("\n[6/6] Saving results...")

    print(
        f"\nRelationships generated: "
        f"{len(relationships):,}"
    )

    print(
        f"\nSaved to:\n{OUTPUT_FILE}"
    )


    # ========================================================
    # TOP RELATIONSHIPS
    # ========================================================

    print("\n" + "=" * 70)
    print("TOP ANTIBIOTIC RELATIONSHIPS")
    print("=" * 70)

    if len(relationships) > 0:

        display_columns = [
            "relationship_rank",
            "antibiotic_a",
            "antibiotic_b",
            "n_both_tested",
            "both_resistant",
            "p_b_res_given_a_res",
            "p_b_res_given_a_sus",
            "risk_ratio",
            "jaccard_resistance",
            "phi_correlation",
        ]

        print(
            relationships[
                display_columns
            ]
            .head(15)
            .to_string(index=False)
        )


    # ========================================================
    # IMPORTANT INTERPRETATION
    # ========================================================

    print("\n" + "=" * 70)
    print("INTERPRETATION")
    print("=" * 70)

    print(
        "\nThese results represent observed associations "
        "between resistance phenotypes."
    )

    print(
        "\nThey do NOT prove that one antibiotic "
        "causes resistance to another."
    )

    print(
        "\nStrong relationships may reflect shared "
        "resistance mechanisms, genetic determinants, "
        "organism/strain structure, or selection pressure."
    )

    print("\nSTEP 3 COMPLETE.")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()