from pathlib import Path
import pandas as pd
import sys


# ============================================================
# STEP 1: AST DATA PREPROCESSING
# ============================================================

# Project root:
# kpr/
# ├── data/
# └── backend/
#     └── preprocessing/
#
PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILES = (
    PROJECT_ROOT / "data" / "ast_isolate_level.csv",
    PROJECT_ROOT / "ast_isolate_level.csv",
)
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_FILE = OUTPUT_DIR / "clean_ast_isolate_level.csv"


# ------------------------------------------------------------
# Required columns
# ------------------------------------------------------------

REQUIRED_COLUMNS = {
    "isolate_id",
    "collection_date",
    "organism",
    "ward",
    "specimen_type",
    "hospital_id",
    "antibiotic",
    "ast_result",
}


# ------------------------------------------------------------
# Main preprocessing function
# ------------------------------------------------------------

def main():

    print("=" * 70)
    print("STEP 1 - AST DATA PREPROCESSING")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Check input file
    # --------------------------------------------------------

    print("\n[1/8] Checking input file:")
    input_file = next(
        (
            candidate
            for candidate in INPUT_FILES
            if candidate.is_file() and candidate.stat().st_size > 0
        ),
        None,
    )

    if input_file is None:
        print("\nERROR: No non-empty input CSV found. Checked:")
        for candidate in INPUT_FILES:
            print(f"  - {candidate}")
        sys.exit(1)

    print(f"Using input file: {input_file}")


    # --------------------------------------------------------
    # 2. Load dataset
    # --------------------------------------------------------

    print("\n[2/8] Loading AST dataset...")

    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        print(f"ERROR while reading CSV: {e}")
        sys.exit(1)

    print(f"Rows loaded: {len(df):,}")
    print(f"Columns found: {len(df.columns)}")


    # --------------------------------------------------------
    # 3. Normalize column names
    # --------------------------------------------------------

    print("\n[3/8] Checking columns...")

    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    print("\nColumns:")
    for col in df.columns:
        print(f"  - {col}")


    missing_columns = REQUIRED_COLUMNS - set(df.columns)

    if missing_columns:
        print("\nERROR: Missing required columns:")

        for col in sorted(missing_columns):
            print(f"  - {col}")

        sys.exit(1)

    print("\nAll required columns are present.")


    # --------------------------------------------------------
    # 4. Clean text fields
    # --------------------------------------------------------

    print("\n[4/8] Cleaning text fields...")

    text_columns = [
        "isolate_id",
        "organism",
        "ward",
        "specimen_type",
        "hospital_id",
        "antibiotic",
        "ast_result",
    ]

    for col in text_columns:
        df[col] = df[col].astype("string").str.strip()

    # Standardize AST result
    df["ast_result"] = df["ast_result"].str.upper()

    print("Text fields cleaned.")


    # --------------------------------------------------------
    # 5. Validate AST results
    # --------------------------------------------------------

    print("\n[5/8] Validating AST results...")

    valid_ast = {"S", "I", "R"}

    invalid_ast = set(
        df["ast_result"].dropna().unique()
    ) - valid_ast

    if invalid_ast:
        print("\nERROR: Invalid AST values detected:")

        for value in sorted(invalid_ast):
            print(f"  - {value}")

        print("\nExpected values: S, I, R")
        sys.exit(1)

    print("AST values are valid.")

    print("\nAST distribution:")
    print(df["ast_result"].value_counts(dropna=False))


    # --------------------------------------------------------
    # 6. Process collection dates
    # --------------------------------------------------------

    print("\n[6/8] Processing collection dates...")

    df["collection_date"] = pd.to_datetime(
        df["collection_date"],
        errors="coerce"
    )

    invalid_dates = df["collection_date"].isna().sum()

    if invalid_dates > 0:
        print(
            f"WARNING: {invalid_dates:,} rows have invalid/missing dates."
        )

    # Time features
    df["year"] = df["collection_date"].dt.year
    df["month"] = df["collection_date"].dt.month

    df["year_month"] = (
        df["collection_date"]
        .dt.to_period("M")
        .astype("string")
    )

    df["quarter"] = (
        df["collection_date"]
        .dt.to_period("Q")
        .astype("string")
    )

    print("Date processing complete.")


    # --------------------------------------------------------
    # 7. Create resistance indicators
    # --------------------------------------------------------

    print("\n[7/8] Creating resistance indicators...")

    # Keep S / I / R separate.
    # IMPORTANT:
    # I is NOT treated as resistant.

    df["is_resistant"] = (
        df["ast_result"] == "R"
    ).astype("int8")

    df["is_susceptible"] = (
        df["ast_result"] == "S"
    ).astype("int8")

    df["is_intermediate"] = (
        df["ast_result"] == "I"
    ).astype("int8")

    # Binary resistance:
    #
    # R -> 1
    # S -> 0
    # I -> NaN
    #
    # This will be useful later for statistical modeling.

    df["binary_resistance"] = df["ast_result"].map({
        "R": 1,
        "S": 0,
        "I": pd.NA
    }).astype("Int8")

    print("Resistance indicators created.")


    # --------------------------------------------------------
    # 8. Remove exact duplicates
    # --------------------------------------------------------

    print("\n[8/8] Removing exact duplicate records...")

    before = len(df)

    df = df.drop_duplicates()

    after = len(df)

    duplicates_removed = before - after

    print(
        f"Duplicates removed: {duplicates_removed:,}"
    )


    # --------------------------------------------------------
    # Sort dataset
    # --------------------------------------------------------

    df = df.sort_values(
        by=[
            "collection_date",
            "isolate_id",
            "antibiotic"
        ],
        na_position="last"
    ).reset_index(drop=True)


    # --------------------------------------------------------
    # Missing-value report
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("MISSING VALUE REPORT")
    print("=" * 70)

    missing = df.isna().sum()

    missing = missing[missing > 0]

    if len(missing) == 0:
        print("No missing values detected.")
    else:
        for column, count in missing.items():
            percentage = (count / len(df)) * 100

            print(
                f"{column:25s} "
                f"{count:10,} "
                f"({percentage:.2f}%)"
            )


    # --------------------------------------------------------
    # Dataset summary
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)

    print(f"Total rows       : {len(df):,}")
    print(f"Total columns    : {len(df.columns):,}")

    print(
        f"Unique isolates  : "
        f"{df['isolate_id'].nunique():,}"
    )

    print(
        f"Organisms        : "
        f"{df['organism'].nunique():,}"
    )

    print(
        f"Antibiotics      : "
        f"{df['antibiotic'].nunique():,}"
    )

    print(
        f"Hospitals        : "
        f"{df['hospital_id'].nunique():,}"
    )

    print(
        f"Wards            : "
        f"{df['ward'].nunique():,}"
    )

    print(
        f"Specimen types   : "
        f"{df['specimen_type'].nunique():,}"
    )

    if df["collection_date"].notna().any():

        min_date = df["collection_date"].min()
        max_date = df["collection_date"].max()

        print(
            f"Date range       : "
            f"{min_date.date()} → {max_date.date()}"
        )


    # --------------------------------------------------------
    # Antibiotics
    # --------------------------------------------------------

    print("\nAntibiotics:")

    for antibiotic in sorted(
        df["antibiotic"].dropna().unique()
    ):
        print(f"  - {antibiotic}")


    # --------------------------------------------------------
    # Organisms
    # --------------------------------------------------------

    print("\nOrganisms:")

    for organism in sorted(
        df["organism"].dropna().unique()
    ):
        print(f"  - {organism}")


    # --------------------------------------------------------
    # Save processed dataset
    # --------------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("\nSaving processed dataset...")

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\n" + "=" * 70)
    print("STEP 1 COMPLETE")
    print("=" * 70)

    print(f"\nProcessed file:")
    print(OUTPUT_FILE)

    print(
        f"\nFinal dataset size: "
        f"{len(df):,} rows × {len(df.columns)} columns"
    )

    print("\nNext step: Step 2 - Generate analytical datasets.")


# ------------------------------------------------------------
# Run script
# ------------------------------------------------------------

if __name__ == "__main__":
    main()