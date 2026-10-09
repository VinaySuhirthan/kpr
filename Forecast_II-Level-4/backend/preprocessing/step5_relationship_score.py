from pathlib import Path
import pandas as pd
import numpy as np
import sys


# ============================================================
# STEP 5
# COMBINED ANTIBIOTIC RELATIONSHIP SCORE
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

SAME_ISOLATE_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "same_isolate_antibiotic_relationships.csv"
)

TEMPORAL_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "temporal_lagged_relationships.csv"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
)

OUTPUT_FILE = (
    OUTPUT_DIR
    / "combined_antibiotic_relationships.csv"
)


# ============================================================
# WEIGHTS
# ============================================================

# Same-isolate evidence
SAME_ISOLATE_WEIGHT = 0.40

# Temporal evidence
TEMPORAL_WEIGHT = 0.40

# Lagged evidence
LAGGED_WEIGHT = 0.20


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("STEP 5 - COMBINED ANTIBIOTIC RELATIONSHIP SCORE")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Check files
    # --------------------------------------------------------

    print("\n[1/7] Checking input files...")

    if not SAME_ISOLATE_FILE.exists():
        print("\nERROR: Same-isolate file not found:")
        print(SAME_ISOLATE_FILE)
        print("\nRun Step 3 first.")
        sys.exit(1)

    if not TEMPORAL_FILE.exists():
        print("\nERROR: Temporal file not found:")
        print(TEMPORAL_FILE)
        print("\nRun Step 4 first.")
        sys.exit(1)

    print("Both input files found.")


    # --------------------------------------------------------
    # 2. Load datasets
    # --------------------------------------------------------

    print("\n[2/7] Loading relationship datasets...")

    same = pd.read_csv(
        SAME_ISOLATE_FILE
    )

    temporal = pd.read_csv(
        TEMPORAL_FILE
    )

    print(
        f"Same-isolate relationships : {len(same):,}"
    )

    print(
        f"Temporal relationships     : {len(temporal):,}"
    )


    # --------------------------------------------------------
    # 3. Prepare same-isolate relationships
    # --------------------------------------------------------

    print("\n[3/7] Preparing same-isolate evidence...")

    same = same[
        [
            "antibiotic_a",
            "antibiotic_b",
            "n_both_tested",
            "both_resistant",
            "p_b_res_given_a_res",
            "p_b_res_given_a_sus",
            "risk_ratio",
            "jaccard_resistance",
            "phi_correlation",
            "relationship_strength",
        ]
    ].copy()

    same = same.rename(
        columns={
            "antibiotic_a":
                "source_antibiotic",

            "antibiotic_b":
                "target_antibiotic",

            "relationship_strength":
                "same_isolate_score",
        }
    )


    # --------------------------------------------------------
    # Create BOTH directions
    # --------------------------------------------------------

    reverse = same.copy()

    reverse[
        [
            "source_antibiotic",
            "target_antibiotic",
        ]
    ] = reverse[
        [
            "target_antibiotic",
            "source_antibiotic",
        ]
    ]

    # For the reverse direction,
    # recompute conditional probability:
    #
    # P(A_R | B_R)
    #
    # from counts.

    reverse["p_b_res_given_a_res"] = np.where(
        reverse["n_both_tested"] > 0,
        reverse["both_resistant"]
        / reverse["b_resistant"]
        if "b_resistant" in reverse.columns
        else np.nan,
        np.nan
    )

    # We will calculate directional probabilities
    # properly from the original pair table below.


    # --------------------------------------------------------
    # Rebuild directional same-isolate table
    # --------------------------------------------------------

    original = pd.read_csv(
        SAME_ISOLATE_FILE
    )

    directional_rows = []

    for _, row in original.iterrows():

        a = row["antibiotic_a"]
        b = row["antibiotic_b"]

        both = row["both_resistant"]

        a_res = row["a_resistant"]
        b_res = row["b_resistant"]

        a_sus = (
            row["n_both_tested"]
            - a_res
        )

        b_sus = (
            row["n_both_tested"]
            - b_res
        )

        # A -> B
        directional_rows.append({

            "source_antibiotic": a,
            "target_antibiotic": b,

            "n_both_tested":
                row["n_both_tested"],

            "both_resistant":
                both,

            "conditional_probability":
                (
                    both / a_res
                    if a_res > 0
                    else np.nan
                ),

            "baseline_probability":
                (
                    (row["a_susceptible_b_resistant"] / a_sus)
                    if a_sus > 0
                    else np.nan
                ),

            "risk_ratio":
                row["risk_ratio"],

            "jaccard_resistance":
                row["jaccard_resistance"],

            "phi_correlation":
                row["phi_correlation"],

            "same_isolate_score":
                row["relationship_strength"],
        })

        # B -> A
        directional_rows.append({

            "source_antibiotic": b,
            "target_antibiotic": a,

            "n_both_tested":
                row["n_both_tested"],

            "both_resistant":
                both,

            "conditional_probability":
                (
                    both / b_res
                    if b_res > 0
                    else np.nan
                ),

            "baseline_probability":
                (
                    (row["a_resistant_b_susceptible"] / b_sus)
                    if b_sus > 0
                    else np.nan
                ),

            "risk_ratio":
                row["risk_ratio"],

            "jaccard_resistance":
                row["jaccard_resistance"],

            "phi_correlation":
                row["phi_correlation"],

            "same_isolate_score":
                row["relationship_strength"],
        })

    same_directional = pd.DataFrame(
        directional_rows
    )


    # --------------------------------------------------------
    # 4. Prepare temporal evidence
    # --------------------------------------------------------

    print("\n[4/7] Preparing temporal evidence...")

    temporal = temporal[
        [
            "organism",
            "ward",
            "source_antibiotic",
            "target_antibiotic",
            "lag_months",
            "n_observations",
            "correlation",
            "r_squared",
            "temporal_relationship_score",
        ]
    ].copy()

    # --------------------------------------------------------
    # Separate:
    #
    # lag 0 = contemporaneous
    # lag 1-3 = future relationship
    # --------------------------------------------------------

    temporal_zero = (
        temporal[
            temporal["lag_months"] == 0
        ]
        .groupby(
            [
                "organism",
                "ward",
                "source_antibiotic",
                "target_antibiotic",
            ],
            as_index=False
        )
        .agg(
            temporal_correlation=(
                "correlation",
                "mean"
            ),

            temporal_score=(
                "temporal_relationship_score",
                "mean"
            )
        )
    )

    temporal_lagged = (
        temporal[
            temporal["lag_months"] > 0
        ]
        .groupby(
            [
                "organism",
                "ward",
                "source_antibiotic",
                "target_antibiotic",
            ],
            as_index=False
        )
        .agg(
            lagged_correlation=(
                "correlation",
                "max"
            ),

            lagged_score=(
                "temporal_relationship_score",
                "max"
            ),

            best_lag_months=(
                "lag_months",
                lambda x:
                x.iloc[
                    np.argmax(
                        temporal.loc[
                            x.index,
                            "temporal_relationship_score"
                        ].to_numpy()
                    )
                ]
            )
        )
    )


    # --------------------------------------------------------
    # 5. Combine
    # --------------------------------------------------------

    print("\n[5/7] Combining relationship evidence...")

    # --------------------------------------------------------
    # Same-isolate evidence has no organism/ward dimension.
    #
    # We therefore attach the same-isolate relationship to
    # every organism × ward combination where temporal
    # evidence exists.
    # --------------------------------------------------------

    combined = temporal_zero.merge(
        temporal_lagged,
        on=[
            "organism",
            "ward",
            "source_antibiotic",
            "target_antibiotic",
        ],
        how="outer"
    )

    combined = combined.merge(
        same_directional,
        on=[
            "source_antibiotic",
            "target_antibiotic",
        ],
        how="left"
    )


    # --------------------------------------------------------
    # Fill missing evidence
    # --------------------------------------------------------

    for column in [
        "same_isolate_score",
        "temporal_score",
        "lagged_score",
    ]:

        if column in combined.columns:
            combined[column] = pd.to_numeric(
                combined[column],
                errors="coerce"
            )


    # --------------------------------------------------------
    # Normalize scores
    # --------------------------------------------------------

    # Same-isolate score is already 0-1
    combined["same_isolate_normalized"] = (
        combined["same_isolate_score"]
        .clip(0, 1)
    )

    # Temporal score = absolute correlation
    combined["temporal_normalized"] = (
        combined["temporal_score"]
        .abs()
        .clip(0, 1)
    )

    # Lagged score = strongest absolute lagged correlation
    combined["lagged_normalized"] = (
        combined["lagged_score"]
        .abs()
        .clip(0, 1)
    )


    # --------------------------------------------------------
    # Final score
    # --------------------------------------------------------

    combined[
        "combined_relationship_score"
    ] = (

        SAME_ISOLATE_WEIGHT
        * combined["same_isolate_normalized"].fillna(0)

        +

        TEMPORAL_WEIGHT
        * combined["temporal_normalized"].fillna(0)

        +

        LAGGED_WEIGHT
        * combined["lagged_normalized"].fillna(0)
    )


    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    evidence_count = (
        combined[
            [
                "same_isolate_normalized",
                "temporal_normalized",
                "lagged_normalized",
            ]
        ]
        .notna()
        .sum(axis=1)
    )

    combined["evidence_count"] = evidence_count

    combined["evidence_level"] = np.select(
        [
            combined["evidence_count"] >= 3,
            combined["evidence_count"] == 2,
            combined["evidence_count"] == 1,
        ],
        [
            "high",
            "moderate",
            "limited",
        ],
        default="limited"
    )


    # --------------------------------------------------------
    # Relationship classification
    # --------------------------------------------------------

    combined["relationship_class"] = np.select(
        [
            combined["combined_relationship_score"] >= 0.70,
            combined["combined_relationship_score"] >= 0.50,
            combined["combined_relationship_score"] >= 0.30,
        ],
        [
            "strong",
            "moderate",
            "weak",
        ],
        default="very_weak"
    )


    # --------------------------------------------------------
    # Rank
    # --------------------------------------------------------

    combined = combined.sort_values(
        [
            "combined_relationship_score",
            "evidence_count",
        ],
        ascending=[
            False,
            False,
        ]
    ).reset_index(
        drop=True
    )

    combined.insert(
        0,
        "relationship_rank",
        range(
            1,
            len(combined) + 1
        )
    )


    # --------------------------------------------------------
    # 6. Save
    # --------------------------------------------------------

    print("\n[6/7] Saving combined relationships...")

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    combined.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print(
        f"Rows generated: "
        f"{len(combined):,}"
    )

    print(
        f"Saved to:\n{OUTPUT_FILE}"
    )


    # --------------------------------------------------------
    # 7. Display top relationships
    # --------------------------------------------------------

    print("\n[7/7] TOP COMBINED RELATIONSHIPS")

    display_columns = [
        "relationship_rank",
        "organism",
        "ward",
        "source_antibiotic",
        "target_antibiotic",
        "same_isolate_score",
        "temporal_score",
        "lagged_score",
        "best_lag_months",
        "combined_relationship_score",
        "evidence_level",
        "relationship_class",
    ]

    print(
        combined[
            display_columns
        ]
        .head(25)
        .to_string(index=False)
    )


    print("\n" + "=" * 70)
    print("STEP 5 COMPLETE")
    print("=" * 70)

    print(
        "\nThe combined score is an analytical ranking, "
        "not a causal probability."
    )

    print(
        "\nNext step: Step 6 - ML prediction of future "
        "antibiotic resistance."
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()