import os
import warnings
import numpy as np
import pandas as pd

from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor

warnings.filterwarnings("ignore")


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

INPUT_FILE = os.path.join(
    PROJECT_ROOT,
    "data",
    "processed",
    "monthly_resistance_rates_generated.csv"
)

OUTPUT_DIR = os.path.join(
    PROJECT_ROOT,
    "data",
    "processed"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# CONFIG
# ============================================================

VALIDATION_YEARS = [2021, 2022, 2023, 2024, 2025]

ENSEMBLE_WEIGHTS = {
    "xgboost": 0.50,
    "random_forest": 0.25,
    "extra_trees": 0.25,
}


# ============================================================
# METRICS
# ============================================================

def mae(y_true, y_pred):
    return np.mean(np.abs(y_true - y_pred))


def rmse(y_true, y_pred):
    return np.sqrt(np.mean((y_true - y_pred) ** 2))


def r2_score_numpy(y_true, y_pred):
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)

    if ss_tot == 0:
        return np.nan

    return 1 - (ss_res / ss_tot)


# ============================================================
# FEATURE ENGINEERING
# ============================================================

def create_features(df, antibiotic):

    work = df.copy()

    target = work[antibiotic]

    features = pd.DataFrame(index=work.index)

    # Current resistance
    features[f"{antibiotic}_current"] = target

    # Lag features
    features[f"{antibiotic}_lag1"] = target.shift(1)
    features[f"{antibiotic}_lag2"] = target.shift(2)
    features[f"{antibiotic}_lag3"] = target.shift(3)

    # Rolling mean
    features[f"{antibiotic}_mean3"] = (
        target.shift(1)
        .rolling(3)
        .mean()
    )

    features[f"{antibiotic}_mean6"] = (
        target.shift(1)
        .rolling(6)
        .mean()
    )

    # Rolling standard deviation
    features[f"{antibiotic}_std3"] = (
        target.shift(1)
        .rolling(3)
        .std()
    )

    # 3-month trend
    features[f"{antibiotic}_trend3"] = (
        target.shift(1) -
        target.shift(4)
    )

    return features


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("STEP 6F - 3 MODEL ENSEMBLE FORECASTING")
print("=" * 70)

print("\nLoading data:")
print(INPUT_FILE)

df = pd.read_csv(INPUT_FILE)

df["year_month"] = pd.to_datetime(df["year_month"])

print("\nRows loaded:", len(df))


# ============================================================
# IMPORTANT:
# AGGREGATE SPECIMEN TYPES
# ============================================================

if "specimen_type" in df.columns:

    grouped = (
        df.groupby(
            [
                "year_month",
                "organism",
                "ward",
                "antibiotic"
            ],
            as_index=False
        )
        .agg(
            total_tested=("total_tested", "sum"),
            resistant_count=("resistant_count", "sum")
        )
    )

    grouped["resistance_rate"] = (
        grouped["resistant_count"] /
        grouped["total_tested"]
    )

else:

    grouped = df.copy()


# ============================================================
# PIVOT
# ============================================================

pivot = grouped.pivot_table(
    index=[
        "year_month",
        "organism",
        "ward"
    ],
    columns="antibiotic",
    values="resistance_rate"
).reset_index()

pivot = pivot.sort_values(
    [
        "organism",
        "ward",
        "year_month"
    ]
)


ANTIBIOTICS = sorted(
    [
        c for c in pivot.columns
        if c not in [
            "year_month",
            "organism",
            "ward"
        ]
    ]
)

print("\nAntibiotics:", len(ANTIBIOTICS))
print(ANTIBIOTICS)

print("\nOrganisms:", pivot["organism"].nunique())
print("Wards:", pivot["ward"].nunique())


# ============================================================
# RESULTS
# ============================================================

all_results = []


# ============================================================
# MODEL LOOP
# ============================================================

for organism in sorted(pivot["organism"].unique()):

    for ward in sorted(pivot["ward"].unique()):

        subset = pivot[
            (pivot["organism"] == organism) &
            (pivot["ward"] == ward)
        ].copy()

        subset = subset.sort_values("year_month")

        if len(subset) < 24:
            continue

        print(
            f"\nProcessing: {organism} | {ward}"
        )

        for antibiotic in ANTIBIOTICS:

            if antibiotic not in subset.columns:
                continue

            # ------------------------------------------------
            # TARGET = NEXT MONTH
            # ------------------------------------------------

            subset["target"] = (
                subset[antibiotic]
                .shift(-1)
            )

            # ------------------------------------------------
            # FEATURES
            # ------------------------------------------------

            X = create_features(
                subset,
                antibiotic
            )

            y = subset["target"]

            data = pd.concat(
                [
                    subset[
                        [
                            "year_month",
                            antibiotic
                        ]
                    ],
                    X,
                    y.rename("target")
                ],
                axis=1
            )

            # Remove missing values
            data = data.dropna()

            if len(data) < 24:
                continue

            # ------------------------------------------------
            # TIME SPLIT
            # ------------------------------------------------

            train = data[
                data["year_month"].dt.year < 2021
            ]

            for validation_year in VALIDATION_YEARS:

                train_fold = data[
                    data["year_month"].dt.year < validation_year
                ]

                test_fold = data[
                    data["year_month"].dt.year ==
                    validation_year
                ]

                if len(train_fold) < 12:
                    continue

                if len(test_fold) == 0:
                    continue

                feature_columns = [
                    c for c in X.columns
                ]

                X_train = train_fold[
                    feature_columns
                ]

                y_train = train_fold["target"]

                X_test = test_fold[
                    feature_columns
                ]

                y_test = test_fold["target"]

                # ====================================================
                # MODEL 1: XGBOOST
                # ====================================================

                xgb_model = XGBRegressor(
                    n_estimators=600,
                    max_depth=3,
                    learning_rate=0.03,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    min_child_weight=3,
                    reg_alpha=0.1,
                    reg_lambda=1.0,
                    objective="reg:squarederror",
                    random_state=42,
                    n_jobs=2,
                    verbosity=0
                )

                xgb_model.fit(
                    X_train,
                    y_train
                )

                xgb_pred = xgb_model.predict(
                    X_test
                )

                # ====================================================
                # MODEL 2: RANDOM FOREST
                # ====================================================

                rf_model = RandomForestRegressor(
                    n_estimators=400,
                    max_depth=6,
                    min_samples_leaf=2,
                    max_features=0.8,
                    random_state=42,
                    n_jobs=2
                )

                rf_model.fit(
                    X_train,
                    y_train
                )

                rf_pred = rf_model.predict(
                    X_test
                )

                # ====================================================
                # MODEL 3: EXTRA TREES
                # ====================================================

                et_model = ExtraTreesRegressor(
                    n_estimators=400,
                    max_depth=6,
                    min_samples_leaf=2,
                    max_features=0.8,
                    random_state=42,
                    n_jobs=2
                )

                et_model.fit(
                    X_train,
                    y_train
                )

                et_pred = et_model.predict(
                    X_test
                )

                # ====================================================
                # ENSEMBLE
                # ====================================================

                ensemble_pred = (
                    ENSEMBLE_WEIGHTS["xgboost"] *
                    xgb_pred
                    +
                    ENSEMBLE_WEIGHTS["random_forest"] *
                    rf_pred
                    +
                    ENSEMBLE_WEIGHTS["extra_trees"] *
                    et_pred
                )

                # Keep resistance rate valid
                xgb_pred = np.clip(
                    xgb_pred,
                    0,
                    1
                )

                rf_pred = np.clip(
                    rf_pred,
                    0,
                    1
                )

                et_pred = np.clip(
                    et_pred,
                    0,
                    1
                )

                ensemble_pred = np.clip(
                    ensemble_pred,
                    0,
                    1
                )

                # ====================================================
                # PERSISTENCE BASELINE
                # ====================================================

                baseline_pred = test_fold[
                    antibiotic
                ].values

                baseline_pred = np.clip(
                    baseline_pred,
                    0,
                    1
                )

                # ====================================================
                # METRICS
                # ====================================================

                xgb_mae = mae(
                    y_test,
                    xgb_pred
                )

                rf_mae = mae(
                    y_test,
                    rf_pred
                )

                et_mae = mae(
                    y_test,
                    et_pred
                )

                ensemble_mae = mae(
                    y_test,
                    ensemble_pred
                )

                baseline_mae = mae(
                    y_test,
                    baseline_pred
                )

                xgb_rmse = rmse(
                    y_test,
                    xgb_pred
                )

                rf_rmse = rmse(
                    y_test,
                    rf_pred
                )

                et_rmse = rmse(
                    y_test,
                    et_pred
                )

                ensemble_rmse = rmse(
                    y_test,
                    ensemble_pred
                )

                baseline_rmse = rmse(
                    y_test,
                    baseline_pred
                )

                xgb_r2 = r2_score_numpy(
                    y_test,
                    xgb_pred
                )

                rf_r2 = r2_score_numpy(
                    y_test,
                    rf_pred
                )

                et_r2 = r2_score_numpy(
                    y_test,
                    et_pred
                )

                ensemble_r2 = r2_score_numpy(
                    y_test,
                    ensemble_pred
                )

                baseline_r2 = r2_score_numpy(
                    y_test,
                    baseline_pred
                )

                # ------------------------------------------------
                # IMPROVEMENT
                # ------------------------------------------------

                ensemble_improvement = (
                    1 -
                    (
                        ensemble_mae /
                        baseline_mae
                    )
                ) * 100

                ensemble_vs_xgb = (
                    1 -
                    (
                        ensemble_mae /
                        xgb_mae
                    )
                ) * 100

                all_results.append(
                    {
                        "organism": organism,
                        "ward": ward,
                        "antibiotic": antibiotic,
                        "validation_year": validation_year,

                        "n_train": len(train_fold),
                        "n_test": len(test_fold),

                        "baseline_mae":
                            baseline_mae,

                        "xgboost_mae":
                            xgb_mae,

                        "random_forest_mae":
                            rf_mae,

                        "extra_trees_mae":
                            et_mae,

                        "ensemble_mae":
                            ensemble_mae,

                        "baseline_rmse":
                            baseline_rmse,

                        "xgboost_rmse":
                            xgb_rmse,

                        "random_forest_rmse":
                            rf_rmse,

                        "extra_trees_rmse":
                            et_rmse,

                        "ensemble_rmse":
                            ensemble_rmse,

                        "baseline_r2":
                            baseline_r2,

                        "xgboost_r2":
                            xgb_r2,

                        "random_forest_r2":
                            rf_r2,

                        "extra_trees_r2":
                            et_r2,

                        "ensemble_r2":
                            ensemble_r2,

                        "ensemble_improvement_vs_baseline_pct":
                            ensemble_improvement,

                        "ensemble_improvement_vs_xgboost_pct":
                            ensemble_vs_xgb,

                        "xgb_weight":
                            ENSEMBLE_WEIGHTS["xgboost"],

                        "rf_weight":
                            ENSEMBLE_WEIGHTS["random_forest"],

                        "et_weight":
                            ENSEMBLE_WEIGHTS["extra_trees"],
                    }
                )

        print("Finished:", organism, "|", ward)


# ============================================================
# SAVE RESULTS
# ============================================================

results = pd.DataFrame(all_results)

results_file = os.path.join(
    OUTPUT_DIR,
    "ensemble_time_cv_results.csv"
)

results.to_csv(
    results_file,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

summary_rows = []

if len(results) > 0:

    for year in sorted(
        results["validation_year"].unique()
    ):

        r = results[
            results["validation_year"] == year
        ]

        summary_rows.append(
            {
                "validation_year": year,

                "cases": len(r),

                "baseline_mae":
                    r["baseline_mae"].mean(),

                "xgboost_mae":
                    r["xgboost_mae"].mean(),

                "random_forest_mae":
                    r["random_forest_mae"].mean(),

                "extra_trees_mae":
                    r["extra_trees_mae"].mean(),

                "ensemble_mae":
                    r["ensemble_mae"].mean(),

                "baseline_rmse":
                    r["baseline_rmse"].mean(),

                "ensemble_rmse":
                    r["ensemble_rmse"].mean(),

                "ensemble_r2":
                    r["ensemble_r2"].mean(),

                "ensemble_improvement_vs_baseline_pct":
                    r[
                        "ensemble_improvement_vs_baseline_pct"
                    ].mean(),

                "ensemble_improvement_vs_xgboost_pct":
                    r[
                        "ensemble_improvement_vs_xgboost_pct"
                    ].mean(),

                "ensemble_beats_baseline_pct":
                    (
                        r["ensemble_mae"]
                        <
                        r["baseline_mae"]
                    ).mean() * 100,

                "ensemble_beats_xgboost_pct":
                    (
                        r["ensemble_mae"]
                        <
                        r["xgboost_mae"]
                    ).mean() * 100,
            }
        )


    # Overall
    summary_rows.append(
        {
            "validation_year": "OVERALL",

            "cases": len(results),

            "baseline_mae":
                results["baseline_mae"].mean(),

            "xgboost_mae":
                results["xgboost_mae"].mean(),

            "random_forest_mae":
                results["random_forest_mae"].mean(),

            "extra_trees_mae":
                results["extra_trees_mae"].mean(),

            "ensemble_mae":
                results["ensemble_mae"].mean(),

            "baseline_rmse":
                results["baseline_rmse"].mean(),

            "ensemble_rmse":
                results["ensemble_rmse"].mean(),

            "ensemble_r2":
                results["ensemble_r2"].mean(),

            "ensemble_improvement_vs_baseline_pct":
                results[
                    "ensemble_improvement_vs_baseline_pct"
                ].mean(),

            "ensemble_improvement_vs_xgboost_pct":
                results[
                    "ensemble_improvement_vs_xgboost_pct"
                ].mean(),

            "ensemble_beats_baseline_pct":
                (
                    results["ensemble_mae"]
                    <
                    results["baseline_mae"]
                ).mean() * 100,

            "ensemble_beats_xgboost_pct":
                (
                    results["ensemble_mae"]
                    <
                    results["xgboost_mae"]
                ).mean() * 100,
        }
    )


summary = pd.DataFrame(
    summary_rows
)

summary_file = os.path.join(
    OUTPUT_DIR,
    "ensemble_time_cv_summary.csv"
)

summary.to_csv(
    summary_file,
    index=False
)


# ============================================================
# PRINT FINAL RESULTS
# ============================================================

overall = summary[
    summary["validation_year"] == "OVERALL"
].iloc[0]

print("\n")
print("=" * 70)
print("ENSEMBLE RESULTS")
print("=" * 70)

print(
    f"\nValidation cases: "
    f"{int(overall['cases'])}"
)

print(
    f"\nBaseline MAE: "
    f"{overall['baseline_mae']:.4f}"
)

print(
    f"XGBoost MAE: "
    f"{overall['xgboost_mae']:.4f}"
)

print(
    f"Random Forest MAE: "
    f"{overall['random_forest_mae']:.4f}"
)

print(
    f"Extra Trees MAE: "
    f"{overall['extra_trees_mae']:.4f}"
)

print(
    f"Ensemble MAE: "
    f"{overall['ensemble_mae']:.4f}"
)

print(
    f"\nEnsemble RMSE: "
    f"{overall['ensemble_rmse']:.4f}"
)

print(
    f"Ensemble R²: "
    f"{overall['ensemble_r2']:.4f}"
)

print(
    f"\nEnsemble improvement vs baseline: "
    f"{overall['ensemble_improvement_vs_baseline_pct']:.2f}%"
)

print(
    f"Ensemble improvement vs XGBoost: "
    f"{overall['ensemble_improvement_vs_xgboost_pct']:.2f}%"
)

print(
    f"\nEnsemble beats baseline: "
    f"{overall['ensemble_beats_baseline_pct']:.1f}%"
    " of validation cases"
)

print(
    f"Ensemble beats XGBoost: "
    f"{overall['ensemble_beats_xgboost_pct']:.1f}%"
    " of validation cases"
)

print("\nSaved:")
print(results_file)
print(summary_file)

print("\nDONE.")