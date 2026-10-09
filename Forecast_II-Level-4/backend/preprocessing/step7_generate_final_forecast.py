from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor


PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "monthly_resistance_rates_generated.csv"
)
OUTPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "future_resistance_forecast.csv"
)

FEATURE_COLUMNS = [
    "current",
    "lag1",
    "lag2",
    "lag3",
    "mean3",
    "mean6",
    "std3",
    "trend3",
]


def create_features(series):
    features = pd.DataFrame(index=series.index)
    features["current"] = series
    features["lag1"] = series.shift(1)
    features["lag2"] = series.shift(2)
    features["lag3"] = series.shift(3)
    features["mean3"] = series.shift(1).rolling(3).mean()
    features["mean6"] = series.shift(1).rolling(6).mean()
    features["std3"] = series.shift(1).rolling(3).std()
    features["trend3"] = series.shift(1) - series.shift(4)
    return features


def classify_risk(change):
    if change < 0:
        return "DECREASING"
    if change >= 0.05:
        return "HIGH"
    if change >= 0.02:
        return "MEDIUM"
    return "LOW"


def main():
    print("=" * 70)
    print("STEP 7 - GENERATING FINAL NEXT-MONTH FORECASTS")
    print("=" * 70)
    print(f"\nLoading monthly data:\n{INPUT_FILE}")

    if not INPUT_FILE.is_file():
        raise FileNotFoundError(f"Monthly resistance dataset not found: {INPUT_FILE}")

    monthly = pd.read_csv(INPUT_FILE, parse_dates=["collection_date"])
    required_columns = {
        "year_month",
        "organism",
        "ward",
        "antibiotic",
        "total_tested",
        "resistant_count",
    }
    missing_columns = required_columns - set(monthly.columns)
    if missing_columns:
        raise ValueError(
            f"Monthly resistance dataset is missing required columns: "
            f"{sorted(missing_columns)}"
        )

    monthly["year_month"] = pd.to_datetime(monthly["year_month"])
    monthly = (
        monthly.groupby(
            ["year_month", "organism", "ward", "antibiotic"],
            as_index=False,
        )
        .agg(
            total_tested=("total_tested", "sum"),
            resistant_count=("resistant_count", "sum"),
        )
    )
    monthly["resistance_rate"] = (
        monthly["resistant_count"] / monthly["total_tested"]
    )
    monthly["resistance_rate"] = monthly["resistance_rate"].clip(0, 1)
    print(f"Monthly organism/ward/antibiotic rows: {len(monthly):,}")

    forecasts = []
    groups = monthly.groupby(["organism", "ward"], sort=True)
    for (organism, ward), group in groups:
        pivot = (
            group.pivot(
                index="year_month",
                columns="antibiotic",
                values="resistance_rate",
            )
            .sort_index()
        )
        if pivot.empty:
            continue

        complete_months = pd.date_range(
            pivot.index.min(),
            pivot.index.max(),
            freq="MS",
        )
        pivot = pivot.reindex(complete_months)
        pivot.index.name = "year_month"

        for antibiotic in pivot.columns:
            series = pivot[antibiotic].astype(float)
            observed = series.dropna()
            if observed.empty:
                continue

            latest_month = observed.index[-1]
            current_resistance = float(observed.iloc[-1])
            features = create_features(series)
            target = series.shift(-1)
            training = features.join(target.rename("target")).dropna()
            forecast_features = features.loc[[latest_month], FEATURE_COLUMNS]

            if forecast_features.isna().any(axis=None):
                raise ValueError(
                    "Insufficient contiguous history to forecast "
                    f"{organism} / {ward} / {antibiotic} at {latest_month:%Y-%m}."
                )
            if training.empty:
                raise ValueError(
                    f"No training rows available for {organism} / {ward} / "
                    f"{antibiotic}."
                )

            model = ExtraTreesRegressor(
                n_estimators=400,
                max_depth=6,
                min_samples_leaf=2,
                max_features=0.8,
                random_state=42,
                n_jobs=2,
            )
            model.fit(training[FEATURE_COLUMNS], training["target"])
            predicted = float(
                np.clip(
                    model.predict(forecast_features)[0],
                    0,
                    1,
                )
            )
            change = predicted - current_resistance
            relative_change = (
                change / current_resistance * 100
                if current_resistance != 0
                else np.nan
            )

            forecasts.append(
                {
                    "organism": organism,
                    "ward": ward,
                    "antibiotic": antibiotic,
                    "last_observed_month": latest_month.strftime("%Y-%m"),
                    "forecast_month": (
                        latest_month + pd.offsets.MonthBegin(1)
                    ).strftime("%Y-%m"),
                    "current_resistance": current_resistance,
                    "predicted_next_month_resistance": predicted,
                    "change_percentage_points": change,
                    "change_relative_percent": relative_change,
                    "risk_level": classify_risk(change),
                    "model_used": "ExtraTreesRegressor",
                }
            )

    if not forecasts:
        raise ValueError("No forecasts were generated from the available data.")

    result = pd.DataFrame(forecasts).sort_values(
        ["risk_level", "organism", "ward", "antibiotic"]
    )
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUTPUT_FILE, index=False)

    print(f"\nForecasts generated: {len(result):,}")
    print(f"Latest observed month: {result['last_observed_month'].max()}")
    print(f"Forecast month: {result['forecast_month'].max()}")
    print(f"Saved to:\n{OUTPUT_FILE}")
    print("\nRisk levels are prototype surveillance alerts, not clinical guidelines.")
    print("\nSTEP 7 COMPLETE.")


if __name__ == "__main__":
    main()
