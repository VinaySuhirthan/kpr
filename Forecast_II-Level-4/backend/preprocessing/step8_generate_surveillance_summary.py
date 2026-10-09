from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
FORECAST_FILE = PROCESSED_DIR / "future_resistance_forecast.csv"
MONTHLY_FILE = PROCESSED_DIR / "monthly_resistance_rates_generated.csv"
RELATIONSHIP_FILE = PROCESSED_DIR / "combined_antibiotic_relationships.csv"

OUTPUT_FILES = {
    "risks": PROCESSED_DIR / "top_resistance_risks.csv",
    "organisms": PROCESSED_DIR / "organism_surveillance_summary.csv",
    "antibiotics": PROCESSED_DIR / "antibiotic_surveillance_summary.csv",
    "wards": PROCESSED_DIR / "ward_surveillance_summary.csv",
    "trends": PROCESSED_DIR / "monthly_resistance_trends.csv",
}

FORECAST_COLUMNS = {
    "organism",
    "ward",
    "antibiotic",
    "last_observed_month",
    "forecast_month",
    "current_resistance",
    "predicted_next_month_resistance",
    "change_percentage_points",
    "risk_level",
    "model_used",
}


def require_columns(frame, required, file_path):
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(
            f"{file_path.name} is missing required columns: {sorted(missing)}"
        )


def main():
    print("=" * 70)
    print("STEP 8 - GENERATING SURVEILLANCE SUMMARIES")
    print("=" * 70)

    for input_file in (FORECAST_FILE, MONTHLY_FILE, RELATIONSHIP_FILE):
        if not input_file.is_file():
            raise FileNotFoundError(
                f"Required input file not found: {input_file}"
            )

    forecasts = pd.read_csv(FORECAST_FILE)
    monthly = pd.read_csv(MONTHLY_FILE)
    relationships = pd.read_csv(RELATIONSHIP_FILE)

    require_columns(forecasts, FORECAST_COLUMNS, FORECAST_FILE)
    require_columns(
        monthly,
        {
            "year_month",
            "organism",
            "ward",
            "antibiotic",
            "total_tested",
            "resistant_count",
        },
        MONTHLY_FILE,
    )
    require_columns(
        relationships,
        {
            "organism",
            "ward",
            "source_antibiotic",
            "target_antibiotic",
            "combined_relationship_score",
            "evidence_level",
            "relationship_class",
        },
        RELATIONSHIP_FILE,
    )

    forecasts["change_percentage_points"] = pd.to_numeric(
        forecasts["change_percentage_points"], errors="raise"
    )
    forecasts["predicted_next_month_resistance"] = pd.to_numeric(
        forecasts["predicted_next_month_resistance"], errors="raise"
    )

    relationship_evidence = (
        relationships.sort_values(
            "combined_relationship_score",
            ascending=False,
        )
        .drop_duplicates(
            ["organism", "ward", "target_antibiotic"],
            keep="first",
        )
        .rename(
            columns={
                "source_antibiotic": "strongest_associated_antibiotic",
                "target_antibiotic": "antibiotic",
                "combined_relationship_score": "strongest_relationship_score",
                "evidence_level": "relationship_evidence_level",
                "relationship_class": "relationship_class",
            }
        )[
            [
                "organism",
                "ward",
                "antibiotic",
                "strongest_associated_antibiotic",
                "strongest_relationship_score",
                "relationship_evidence_level",
                "relationship_class",
            ]
        ]
    )
    risks = forecasts.merge(
        relationship_evidence,
        on=["organism", "ward", "antibiotic"],
        how="left",
        validate="one_to_one",
    )

    risk_priority = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
        "DECREASING": 3,
    }
    risks["_risk_priority"] = risks["risk_level"].map(risk_priority)
    if risks["_risk_priority"].isna().any():
        invalid_levels = sorted(
            risks.loc[risks["_risk_priority"].isna(), "risk_level"]
            .dropna()
            .unique()
        )
        raise ValueError(f"Unexpected forecast risk levels: {invalid_levels}")

    risks = risks.sort_values(
        ["_risk_priority", "change_percentage_points",
         "predicted_next_month_resistance"],
        ascending=[True, False, False],
    ).reset_index(drop=True)
    risks.insert(0, "risk_rank", range(1, len(risks) + 1))

    increasing_order = risks.sort_values(
        "change_percentage_points", ascending=False
    ).index
    decreasing_order = risks.sort_values(
        "change_percentage_points", ascending=True
    ).index
    predicted_order = risks.sort_values(
        "predicted_next_month_resistance", ascending=False
    ).index
    increase_ranks = pd.Series(range(1, len(risks) + 1), index=increasing_order)
    decrease_ranks = pd.Series(range(1, len(risks) + 1), index=decreasing_order)
    predicted_ranks = pd.Series(range(1, len(risks) + 1), index=predicted_order)
    risks["increase_rank"] = risks.index.map(increase_ranks)
    risks["decrease_rank"] = risks.index.map(decrease_ranks)
    risks["predicted_resistance_rank"] = risks.index.map(predicted_ranks)
    risks = risks.drop(columns="_risk_priority")
    risks.to_csv(OUTPUT_FILES["risks"], index=False)

    forecast_summary = (
        forecasts.groupby("organism", as_index=False)
        .agg(
            forecast_combinations=("antibiotic", "size"),
            mean_current_resistance=("current_resistance", "mean"),
            mean_predicted_resistance=(
                "predicted_next_month_resistance",
                "mean",
            ),
            highest_predicted_resistance=(
                "predicted_next_month_resistance",
                "max",
            ),
            mean_change_percentage_points=(
                "change_percentage_points",
                "mean",
            ),
            high_risk_count=("risk_level", lambda values: (values == "HIGH").sum()),
            medium_risk_count=(
                "risk_level",
                lambda values: (values == "MEDIUM").sum(),
            ),
            decreasing_count=(
                "risk_level",
                lambda values: (values == "DECREASING").sum(),
            ),
        )
    )
    forecast_summary.to_csv(OUTPUT_FILES["organisms"], index=False)

    antibiotic_summary = (
        forecasts.groupby("antibiotic", as_index=False)
        .agg(
            forecast_combinations=("organism", "size"),
            mean_current_resistance=("current_resistance", "mean"),
            mean_predicted_resistance=(
                "predicted_next_month_resistance",
                "mean",
            ),
            highest_predicted_resistance=(
                "predicted_next_month_resistance",
                "max",
            ),
            mean_change_percentage_points=(
                "change_percentage_points",
                "mean",
            ),
            high_risk_count=("risk_level", lambda values: (values == "HIGH").sum()),
            medium_risk_count=(
                "risk_level",
                lambda values: (values == "MEDIUM").sum(),
            ),
            decreasing_count=(
                "risk_level",
                lambda values: (values == "DECREASING").sum(),
            ),
        )
    )
    antibiotic_summary.to_csv(OUTPUT_FILES["antibiotics"], index=False)

    ward_groups = (
        forecasts.groupby(
            ["organism", "antibiotic", "ward"],
            as_index=False,
        )
        .agg(
            current_resistance=("current_resistance", "mean"),
            predicted_resistance=(
                "predicted_next_month_resistance",
                "mean",
            ),
            change_percentage_points=("change_percentage_points", "mean"),
            forecast_combinations=("risk_level", "size"),
        )
    )
    ward_values = [
        "current_resistance",
        "predicted_resistance",
        "change_percentage_points",
        "forecast_combinations",
    ]
    ward_summary = ward_groups.pivot(
        index=["organism", "antibiotic"],
        columns="ward",
        values=ward_values,
    )
    ward_summary.columns = [
        f"{metric}_{ward}"
        for metric, ward in ward_summary.columns
    ]
    ward_summary = ward_summary.reset_index()
    if {"current_resistance_ICU", "current_resistance_General Ward"} <= set(
        ward_summary.columns
    ):
        ward_summary["icu_minus_general_current"] = (
            ward_summary["current_resistance_ICU"]
            - ward_summary["current_resistance_General Ward"]
        )
        ward_summary["icu_minus_general_predicted"] = (
            ward_summary["predicted_resistance_ICU"]
            - ward_summary["predicted_resistance_General Ward"]
        )
    ward_summary.to_csv(OUTPUT_FILES["wards"], index=False)

    monthly["year_month"] = pd.to_datetime(monthly["year_month"])
    historical = (
        monthly.groupby(
            ["year_month", "organism", "ward", "antibiotic"],
            as_index=False,
        )
        .agg(
            total_tested=("total_tested", "sum"),
            resistant_count=("resistant_count", "sum"),
        )
    )
    historical["resistance_rate"] = (
        historical["resistant_count"] / historical["total_tested"]
    )
    historical["resistance_rate_percent"] = (
        historical["resistance_rate"] * 100
    )
    historical.to_csv(OUTPUT_FILES["trends"], index=False)

    print(f"Forecast combinations summarized: {len(forecasts):,}")
    print(f"Top risk/signal table: {OUTPUT_FILES['risks']}")
    print(f"Organism summary: {OUTPUT_FILES['organisms']}")
    print(f"Antibiotic summary: {OUTPUT_FILES['antibiotics']}")
    print(f"ICU/General Ward comparison: {OUTPUT_FILES['wards']}")
    print(f"Monthly historical trends: {OUTPUT_FILES['trends']}")
    print("\nAll risk levels are prototype surveillance alerts, not clinical guidelines.")
    print("\nSTEP 8 COMPLETE.")


if __name__ == "__main__":
    main()
