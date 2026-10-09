from pathlib import Path
import pandas as pd
import numpy as np
from itertools import combinations
import sys


# ============================================================
# STEP 4
# TEMPORAL + LAGGED ANTIBIOTIC RELATIONSHIP ANALYSIS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "monthly_resistance_rates_generated.csv"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
)

OUTPUT_FILE = (
    OUTPUT_DIR
    / "temporal_lagged_relationships.csv"
)


# Number of months to look into the future
MAX_LAG = 3

# Minimum number of paired months required
MIN_OBSERVATIONS = 6


# ============================================================
# PEARSON CORRELATION
# ============================================================

def safe_correlation(x, y):

    valid = pd.concat(
        [x, y],
        axis=1
    ).dropna()

    if len(valid) < MIN_OBSERVATIONS:
        return np.nan

    x_values = valid.iloc[:, 0]
    y_values = valid.iloc[:, 1]

    # Constant series cannot have correlation
    if x_values.nunique() < 2:
        return np.nan

    if y_values.nunique() < 2:
        return np.nan

    return x_values.corr(y_values)


# ============================================================
# SIMPLE LINEAR REGRESSION R-SQUARED
# ============================================================

def calculate_r_squared(x, y):

    valid = pd.concat(
        [x, y],
        axis=1
    ).dropna()

    if len(valid) < MIN_OBSERVATIONS:
        return np.nan

    x_values = valid.iloc[:, 0].to_numpy(
        dtype=float
    )

    y_values = valid.iloc[:, 1].to_numpy(
        dtype=float
    )

    # Constant X cannot predict Y
    if np.std(x_values) == 0:
        return np.nan

    # Simple linear regression
    slope, intercept = np.polyfit(
        x_values,
        y_values,
        1
    )

    predictions = (
        slope * x_values
        + intercept
    )

    ss_res = np.sum(
        (y_values - predictions) ** 2
    )

    ss_tot = np.sum(
        (y_values - np.mean(y_values)) ** 2
    )

    if ss_tot == 0:
        return np.nan

    r_squared = (
        1
        - (ss_res / ss_tot)
    )

    return r_squared


# ============================================================
# ANALYZE ONE DIRECTION
# ============================================================

def analyze_direction(
    group,
    antibiotic_a,
    antibiotic_b,
    lag
):

    # --------------------------------------------------------
    # Sort by time
    # --------------------------------------------------------

    group = group.sort_values(
        "year_month"
    ).copy()

    # Convert month to datetime
    group["month_date"] = pd.to_datetime(
        group["year_month"].astype(str)
        + "-01"
    )

    # --------------------------------------------------------
    # A at time t
    # --------------------------------------------------------

    a_data = (
        group[
            [
                "month_date",
                "resistance_rate"
            ]
        ]
        .rename(
            columns={
                "resistance_rate":
                    "a_resistance_rate"
            }
        )
    )

    # --------------------------------------------------------
    # B at future time t + lag
    # --------------------------------------------------------

    b_data = (
        group[
            [
                "month_date",
                "resistance_rate"
            ]
        ]
        .rename(
            columns={
                "month_date":
                    "future_month"
                ,
                "resistance_rate":
                    "b_future_resistance_rate"
            }
        )
    )

    # Move B backward so that:
    #
    # A at January
    # matches
    # B at February for lag 1
    #
    b_data["month_date"] = (
        b_data["future_month"]
        - pd.DateOffset(months=lag)
    )

    # --------------------------------------------------------
    # Merge
    # --------------------------------------------------------

    merged = pd.merge(
        a_data,
        b_data[
            [
                "month_date",
                "future_month",
                "b_future_resistance_rate"
            ]
        ],
        on="month_date",
        how="inner"
    )

    merged = merged.dropna(
        subset=[
            "a_resistance_rate",
            "b_future_resistance_rate"
        ]
    )

    n = len(merged)

    if n < MIN_OBSERVATIONS:
        return None

    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    correlation = safe_correlation(
        merged["a_resistance_rate"],
        merged["b_future_resistance_rate"]
    )

    r_squared = calculate_r_squared(
        merged["a_resistance_rate"],
        merged["b_future_resistance_rate"]
    )

    # --------------------------------------------------------
    # Direction label
    # --------------------------------------------------------

    if pd.isna(correlation):

        relationship_direction = "insufficient_data"

    elif correlation >= 0.70:

        relationship_direction = "strong_positive"

    elif correlation >= 0.40:

        relationship_direction = "moderate_positive"

    elif correlation > -0.40:

        relationship_direction = "weak_or_no_relationship"

    elif correlation > -0.70:

        relationship_direction = "moderate_negative"

    else:

        relationship_direction = "strong_negative"

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return {
        "antibiotic_a": antibiotic_a,
        "antibiotic_b": antibiotic_b,

        "lag_months": lag,

        "n_observations": n,

        "correlation":
            correlation,

        "r_squared":
            r_squared,

        "relationship_direction":
            relationship_direction,
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("STEP 4 - TEMPORAL + LAGGED RELATIONSHIP ANALYSIS")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Check input
    # --------------------------------------------------------

    print("\n[1/6] Checking monthly dataset...")

    if not INPUT_FILE.exists():

        print("\nERROR: Input dataset not found:")
        print(INPUT_FILE)

        print("\nRun Step 2 first.")

        sys.exit(1)

    print("Input dataset found.")


    # --------------------------------------------------------
    # 2. Load
    # --------------------------------------------------------

    print("\n[2/6] Loading monthly resistance data...")

    df = pd.read_csv(
        INPUT_FILE
    )

    print(
        f"Rows loaded: {len(df):,}"
    )


    # --------------------------------------------------------
    # 3. Basic preparation
    # --------------------------------------------------------

    print("\n[3/6] Preparing temporal data...")

    required_columns = {
        "year_month",
        "organism",
        "ward",
        "antibiotic",
        "resistance_rate",
    }

    missing = (
        required_columns
        - set(df.columns)
    )

    if missing:

        print("\nERROR: Missing columns:")

        for column in sorted(missing):
            print(f"  - {column}")

        sys.exit(1)

    # Make sure resistance rate is numeric
    df["resistance_rate"] = pd.to_numeric(
        df["resistance_rate"],
        errors="coerce"
    )

    # Month ordering
    df["month_date"] = pd.to_datetime(
        df["year_month"].astype(str)
        + "-01"
    )

    df = df.sort_values(
        [
            "organism",
            "ward",
            "antibiotic",
            "month_date",
        ]
    )

    print(
        f"Organisms: {df['organism'].nunique()}"
    )

    print(
        f"Wards: {df['ward'].nunique()}"
    )

    print(
        f"Antibiotics: {df['antibiotic'].nunique()}"
    )


    # --------------------------------------------------------
    # 4. Temporal relationships
    # --------------------------------------------------------

    print("\n[4/6] Calculating temporal relationships...")

    results = []

    group_columns = [
        "organism",
        "ward",
    ]

    grouped = df.groupby(
        group_columns
    )

    group_count = len(grouped)

    print(
        f"Organism × ward groups: {group_count}"
    )

    for group_number, (
        (organism, ward),
        group
    ) in enumerate(
        grouped,
        start=1
    ):

        print(
            f"\nGroup "
            f"[{group_number}/{group_count}] "
            f"{organism} | {ward}"
        )

        antibiotics = sorted(
            group["antibiotic"]
            .dropna()
            .unique()
        )

        # ----------------------------------------------------
        # Create one time series per antibiotic
        # ----------------------------------------------------

        antibiotic_series = {}

        for antibiotic in antibiotics:

            temp = (
                group[
                    group["antibiotic"]
                    == antibiotic
                ]
                [
                    [
                        "month_date",
                        "resistance_rate"
                    ]
                ]
                .drop_duplicates(
                    subset=["month_date"]
                )
                .set_index(
                    "month_date"
                )
                ["resistance_rate"]
            )

            antibiotic_series[
                antibiotic
            ] = temp


        # ----------------------------------------------------
        # Every antibiotic pair
        # ----------------------------------------------------

        pairs = combinations(
            antibiotics,
            2
        )

        for antibiotic_a, antibiotic_b in pairs:

            series_a = (
                antibiotic_series[
                    antibiotic_a
                ]
            )

            series_b = (
                antibiotic_series[
                    antibiotic_b
                ]
            )

            # ------------------------------------------------
            # Bidirectional relationships
            # ------------------------------------------------

            for source, target in [
                (
                    antibiotic_a,
                    antibiotic_b
                ),
                (
                    antibiotic_b,
                    antibiotic_a
                )
            ]:

                source_series = (
                    antibiotic_series[
                        source
                    ]
                )

                target_series = (
                    antibiotic_series[
                        target
                    ]
                )

                # ------------------------------------------------
                # Lag 0, 1, 2, 3
                # ------------------------------------------------

                for lag in range(
                    0,
                    MAX_LAG + 1
                ):

                    source_df = (
                        source_series
                        .rename(
                            "source_rate"
                        )
                        .to_frame()
                    )

                    target_df = (
                        target_series
                        .rename(
                            "target_rate"
                        )
                        .to_frame()
                    )

                    # Shift target backward:
                    #
                    # lag 1:
                    # source Jan -> target Feb
                    #
                    target_df[
                        "target_future"
                    ] = target_df[
                        "target_rate"
                    ].shift(
                        -lag
                    )

                    merged = pd.concat(
                        [
                            source_df[
                                "source_rate"
                            ],
                            target_df[
                                "target_future"
                            ],
                        ],
                        axis=1
                    ).dropna()

                    if len(merged) < MIN_OBSERVATIONS:
                        continue

                    correlation = safe_correlation(
                        merged["source_rate"],
                        merged["target_future"]
                    )

                    r_squared = calculate_r_squared(
                        merged["source_rate"],
                        merged["target_future"]
                    )

                    if pd.isna(correlation):

                        direction = (
                            "insufficient_data"
                        )

                    elif correlation >= 0.70:

                        direction = (
                            "strong_positive"
                        )

                    elif correlation >= 0.40:

                        direction = (
                            "moderate_positive"
                        )

                    elif correlation > -0.40:

                        direction = (
                            "weak_or_no_relationship"
                        )

                    elif correlation > -0.70:

                        direction = (
                            "moderate_negative"
                        )

                    else:

                        direction = (
                            "strong_negative"
                        )

                    results.append({

                        "organism":
                            organism,

                        "ward":
                            ward,

                        "source_antibiotic":
                            source,

                        "target_antibiotic":
                            target,

                        "lag_months":
                            lag,

                        "n_observations":
                            len(merged),

                        "correlation":
                            correlation,

                        "r_squared":
                            r_squared,

                        "relationship_direction":
                            direction,
                    })


    # --------------------------------------------------------
    # 5. Save
    # --------------------------------------------------------

    print("\n[5/6] Saving temporal relationships...")

    results_df = pd.DataFrame(
        results
    )

    if results_df.empty:

        print(
            "\nERROR: No temporal relationships "
            "could be calculated."
        )

        sys.exit(1)

    # Absolute correlation for ranking
    results_df[
        "absolute_correlation"
    ] = results_df[
        "correlation"
    ].abs()

    # --------------------------------------------------------
    # Relationship score
    # --------------------------------------------------------
    #
    # For now:
    #
    # relationship_score =
    #     absolute correlation
    #
    # Later we will combine:
    #
    # same-isolate evidence
    # + temporal evidence
    # + lagged evidence
    # + ML evidence
    #
    # into one final score.

    results_df[
        "temporal_relationship_score"
    ] = results_df[
        "absolute_correlation"
    ]

    results_df = results_df.sort_values(
        [
            "temporal_relationship_score",
            "r_squared",
        ],
        ascending=[
            False,
            False,
        ]
    ).reset_index(
        drop=True
    )

    results_df.insert(
        0,
        "relationship_rank",
        range(
            1,
            len(results_df) + 1
        )
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    results_df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print(
        f"Rows generated: "
        f"{len(results_df):,}"
    )

    print(
        f"Saved to:\n{OUTPUT_FILE}"
    )


    # --------------------------------------------------------
    # 6. Display strongest lagged relationships
    # --------------------------------------------------------

    print("\n[6/6] Strongest temporal relationships")

    print(
        results_df[
            [
                "relationship_rank",
                "organism",
                "ward",
                "source_antibiotic",
                "target_antibiotic",
                "lag_months",
                "n_observations",
                "correlation",
                "r_squared",
                "relationship_direction",
            ]
        ]
        .head(20)
        .to_string(index=False)
    )


    print("\n" + "=" * 70)
    print("STEP 4 COMPLETE")
    print("=" * 70)

    print(
        "\nInterpretation:"
    )

    print(
        "A positive lagged correlation means that higher "
        "resistance in the source antibiotic tends to be "
        "associated with higher resistance in the target "
        "antibiotic in later months."
    )

    print(
        "\nThis is predictive/temporal association, "
        "NOT proof of causation."
    )

    print(
        "\nNext step: Step 5 - Build the antibiotic "
        "relationship score and prediction dataset."
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()