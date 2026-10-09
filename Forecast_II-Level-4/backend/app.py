from pathlib import Path
import json

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

DATASETS = {
    "forecast": (
        "future_resistance_forecast.csv",
        {
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
        },
    ),
    "risks": (
        "top_resistance_risks.csv",
        {"organism", "ward", "antibiotic", "risk_level"},
    ),
    "trends": (
        "monthly_resistance_trends.csv",
        {"year_month", "organism", "ward", "antibiotic", "resistance_rate"},
    ),
    "relationships": (
        "combined_antibiotic_relationships.csv",
        {
            "organism",
            "ward",
            "source_antibiotic",
            "target_antibiotic",
            "combined_relationship_score",
            "evidence_level",
            "relationship_class",
        },
    ),
}

app = FastAPI(
    title="AMR Forecasting API",
    description=(
        "Prototype surveillance forecasts and observed antibiotic "
        "resistance associations from synthetic data."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def load_dataset(dataset_name):
    filename, required_columns = DATASETS[dataset_name]
    file_path = PROCESSED_DIR / filename
    if not file_path.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Required dataset is unavailable: {filename}",
        )

    frame = pd.read_csv(file_path)
    missing = required_columns - set(frame.columns)
    if missing:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Dataset {filename} is missing required columns: "
                f"{sorted(missing)}"
            ),
        )
    return frame


def records(frame):
    return json.loads(frame.to_json(orient="records", date_format="iso"))


def filter_exact(frame, filters):
    filtered = frame
    for column, value in filters.items():
        if value is not None:
            filtered = filtered[filtered[column] == value]
    if filtered.empty:
        raise HTTPException(status_code=404, detail="No matching records found.")
    return filtered


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "AMR Forecasting API"}


@app.get("/api/forecast")
def get_forecasts():
    return records(load_dataset("forecast"))


@app.get("/api/forecast/{organism}/{ward}")
def get_forecasts_by_organism_and_ward(organism: str, ward: str):
    frame = load_dataset("forecast")
    return records(
        filter_exact(
            frame,
            {"organism": organism, "ward": ward},
        )
    )


@app.get("/api/forecast/{organism}/{ward}/{antibiotic}")
def get_forecast(organism: str, ward: str, antibiotic: str):
    frame = load_dataset("forecast")
    return records(
        filter_exact(
            frame,
            {
                "organism": organism,
                "ward": ward,
                "antibiotic": antibiotic,
            },
        )
    )


@app.get("/api/surveillance/risks")
def get_surveillance_risks():
    frame = load_dataset("risks")
    if "risk_rank" in frame.columns:
        frame = frame.sort_values("risk_rank")
    return records(frame)


@app.get("/api/surveillance/trends")
def get_surveillance_trends(
    organism: str | None = Query(default=None),
    ward: str | None = Query(default=None),
    antibiotic: str | None = Query(default=None),
):
    frame = load_dataset("trends")
    filtered = filter_exact(
        frame,
        {
            "organism": organism,
            "ward": ward,
            "antibiotic": antibiotic,
        },
    )
    return records(filtered.sort_values("year_month"))


@app.get("/api/relationships")
def get_relationships():
    return records(load_dataset("relationships"))


@app.get("/api/relationships/{antibiotic}")
def get_relationships_for_antibiotic(antibiotic: str):
    frame = load_dataset("relationships")
    filtered = frame[
        (frame["source_antibiotic"] == antibiotic)
        | (frame["target_antibiotic"] == antibiotic)
    ]
    if filtered.empty:
        raise HTTPException(status_code=404, detail="No relationships found.")
    return records(filtered)


@app.get("/api/summary")
def get_summary():
    forecasts = load_dataset("forecast")
    return {
        "total_organisms": int(forecasts["organism"].nunique()),
        "total_wards": int(forecasts["ward"].nunique()),
        "total_antibiotics": int(forecasts["antibiotic"].nunique()),
        "high_risk_forecasts": int((forecasts["risk_level"] == "HIGH").sum()),
        "medium_risk_forecasts": int(
            (forecasts["risk_level"] == "MEDIUM").sum()
        ),
        "decreasing_forecasts": int(
            (forecasts["risk_level"] == "DECREASING").sum()
        ),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
