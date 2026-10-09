from pathlib import Path
import pandas as pd
import sys


# ============================================================
# STEP 2: GENERATE ANALYTICAL DATASETS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "clean_ast_isolate_level.csv"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
)


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("STEP 2 - GENERATING ANALYTICAL DATASETS")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Check input
    # --------------------------------------------------------

    print("\n[1/5] Checking cleaned dataset...")

    if not INPUT_FILE.exists():
        print("\nERROR: Cleaned dataset not found:")
        print(INPUT_FILE)
        print("\nRun Step 1 first.")
        sys.exit(1)

    print(f"Input file found:")
    print(INPUT_FILE)


    # --------------------------------------------------------
    # 2. Load cleaned dataset
    # --------------------------------------------------------

    print("\n[2/5] Loading cleaned dataset...")

    df = pd.read_csv(
        INPUT_FILE,
        parse_dates=["collection_date"]
    )

    print(f"Rows loaded    : {len(df):,}")
    print(f"Columns loaded : {len(df.columns)}")


    # ========================================================
    # DATASET 1
    # MONTHLY RESISTANCE RATES
    # ========================================================

    print("\n[3/5] Generating monthly resistance rates...")

    # Only S and R are used for resistance-rate calculation.
    # Intermediate results are excluded from the denominator.

    monthly = (
        df[df["ast_result"].isin(["S", "R"])]
        .groupby(
            [
                "year_month",
                "collection_date",
                "organism",
                "ward",
                "specimen_type",
                "hospital_id",
                "antibiotic",
            ],
            as_index=False
        )
        .agg(
            total_tested=("ast_result", "size"),
            resistant_count=("is_resistant", "sum"),
        )
    )

    monthly["resistance_rate"] = (
        monthly["resistant_count"]
        / monthly["total_tested"]
    )

    monthly["resistance_rate_percent"] = (
        monthly["resistance_rate"] * 100
    )

    # Sort
    monthly = monthly.sort_values(
        [
            "year_month",
            "organism",
            "ward",
            "antibiotic",
        ]
    ).reset_index(drop=True)

    monthly_file = (
        OUTPUT_DIR
        / "monthly_resistance_rates_generated.csv"
    )

    monthly.to_csv(
        monthly_file,
        index=False
    )

    print(f"Monthly rows generated: {len(monthly):,}")
    print(f"Saved to:")
    print(monthly_file)


    # ========================================================
    # DATASET 2
    # ISOLATE × ANTIBIOTIC MATRIX
    # ========================================================

    print("\n[4/5] Generating isolate-antibiotic matrix...")

    # Each row = one isolate
    # Each column = one antibiotic
    #
    # Values:
    #   R -> 1
    #   S -> 0
    #   I -> NaN

    matrix_source = df.copy()

    matrix_source["resistance_binary"] = (
        matrix_source["ast_result"]
        .map({
            "R": 1,
            "S": 0,
            "I": pd.NA
        })
        .astype("Float64")
    )

    # Pivot
    matrix = (
        matrix_source
        .pivot_table(
            index=[
                "isolate_id",
                "collection_date",
                "organism",
                "ward",
                "specimen_type",
                "hospital_id",
            ],
            columns="antibiotic",
            values="resistance_binary",
            aggfunc="first"
        )
        .reset_index()
    )

    # Remove pandas column index name
    matrix.columns.name = None

    matrix_file = (
        OUTPUT_DIR
        / "isolate_antibiotic_matrix_generated.csv"
    )

    matrix.to_csv(
        matrix_file,
        index=False
    )

    print(f"Isolate rows generated: {len(matrix):,}")
    print(f"Matrix columns       : {len(matrix.columns):,}")
    print(f"Saved to:")
    print(matrix_file)


    # ========================================================
    # DATASET 3
    # TRAIN / TEST MONTHLY DATA
    # ========================================================

    print("\n[5/5] Generating train/test dataset...")

    train_test = monthly.copy()

    # 2016-2024 -> training
    # 2025      -> testing

    train_test["dataset_split"] = train_test[
        "year_month"
    ].apply(
        lambda x: (
            "train"
            if str(x)[:4] <= "2024"
            else "test"
            if str(x)[:4] == "2025"
            else "outside_range"
        )
    )

    # Keep only intended years
    train_test = train_test[
        train_test["dataset_split"].isin(
            ["train", "test"]
        )
    ].copy()

    train_test_file = (
        OUTPUT_DIR
        / "monthly_resistance_train_test_generated.csv"
    )

    train_test.to_csv(
        train_test_file,
        index=False
    )

    print(f"Train rows: {len(train_test[train_test['dataset_split'] == 'train']):,}")
    print(f"Test rows : {len(train_test[train_test['dataset_split'] == 'test']):,}")

    print(f"Saved to:")
    print(train_test_file)


    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print("\n" + "=" * 70)
    print("STEP 2 COMPLETE")
    print("=" * 70)

    print("\nGenerated datasets:")

    print(
        "\n1. Monthly resistance rates:"
        f"\n   {monthly_file}"
    )

    print(
        "\n2. Isolate-antibiotic matrix:"
        f"\n   {matrix_file}"
    )

    print(
        "\n3. Monthly train/test dataset:"
        f"\n   {train_test_file}"
    )

    print("\n" + "-" * 70)

    print("\nMonthly resistance dataset preview:")
    print(monthly.head(10).to_string(index=False))

    print("\n" + "-" * 70)

    print("\nIsolate-antibiotic matrix preview:")
    print(matrix.head(5).to_string(index=False))

    print("\n" + "-" * 70)

    print("\nTrain/Test distribution:")
    print(
        train_test["dataset_split"]
        .value_counts()
        .sort_index()
    )

    print("\nReady for Step 3: Antibiotic relationship analysis.")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()