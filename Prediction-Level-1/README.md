# AMR Intelligence

Level 1 AMR detection and genotype-phenotype analysis system using CSV-backed genomic and AST data.

## Project layout

- Frontend: React + Vite
- Backend: FastAPI + Uvicorn
- Data source: CSV-backed dataset (dataset mode)
- ML: XGBoost with SHAP explanations

## Run locally

1. Install backend dependencies:
   python -m pip install -r requirements.txt
2. Start the API:
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
3. Start the frontend:
   npm install
   npm run dev
4. Open the Vite frontend and select an organism/isolate.

## Data integrity rules

- AST intermediate results are preserved as `I` and never converted to resistant.
- The system does not fabricate genomic coordinates.
- Missing coordinates are returned as unavailable, not invented.
- AST labels are never used as model input features; they are the target variable for ML training.

## Key endpoints

- GET /health
- GET /api/v1/organisms
- GET /api/v1/isolates
- GET /api/v1/isolates/{isolate_id}
- GET /api/v1/isolates/{isolate_id}/genes
- GET /api/v1/isolates/{isolate_id}/ast
- GET /api/v1/level1/dashboard/{isolate_id}
- POST /api/v1/predict
- GET /api/v1/explain/{isolate_id}/{antibiotic}

