# Antimicrobial Resistance (AMR) Genomics Platform - Level 1

A production-grade, real bioinformatics pipeline and web application for automated AMR gene detection in bacterial genomic sequences, powered by **NCBI AMRFinderPlus**.

---

## 1. Project Overview

The Level 1 AMR Gene Detection module enables researchers to upload genomic sequences in CSV (or FASTA) format, validate the input biologically and structurally, execute NCBI AMRFinderPlus against its curated AMR reference database, and visualize real detected AMR determinants and their exact genomic coordinates.

### Key Characteristics:
- **No Mock / Fabricated Biological Data**: The pipeline does not hardcode gene names, resistance mechanisms, identities, coverage values, or coordinates.
- **Automated Discovery**: Researchers do not need to provide gene names or resistance keywords—AMRFinderPlus identifies AMR determinants directly from sequence alignments.
- **Biological Validation**: Sequences are validated for minimum length (rejecting sub-gene fragments like 16 bp snippets that cannot be annotated) and IUPAC nucleotide compliance.
- **Exact Coordinates**: Contig visualization renders gene tracks using the actual genomic start/end coordinates returned by AMRFinderPlus.

---

## 2. Architecture

```text
Researcher uploads CSV / FASTA
        ↓
Frontend Pre-validation (Extension, Size)
        ↓
FastAPI Backend (POST /api/v1/amr/analyze)
        ↓
Polars CSV / BioPython FASTA Parser (Header validation, Isolate mapping)
        ↓
Biological Sequence Validator (IUPAC alphabet, min length >= 50 bp)
        ↓
Safe Temp Workspace (BioPython FASTA generation)
        ↓
NCBI AMRFinderPlus Subprocess Execution
        ↓
Real AMRFinderPlus Output Parsing (TSV mapping to Pydantic models)
        ↓
Summary & Visualization Track Generation
        ↓
Structured JSON Response
        ↓
React Dashboard (Real Data Tables, Genome Tracks, CSV & JSON Downloads)
```

---

## 3. Directory Structure

```text
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point & CORS
│   │   ├── api/
│   │   │   ├── routes_amr.py        # /analyze, /tool-status, /results endpoints
│   │   │   ├── routes_genome.py     # Genomic utility endpoints
│   │   │   └── routes_health.py     # /health endpoint
│   │   ├── services/
│   │   │   ├── csv_parser.py        # Polars-based genomic CSV parser & mapping
│   │   │   ├── fasta_parser.py      # BioPython-based FASTA parser
│   │   │   ├── sequence_validator.py# IUPAC nucleotide & length validation
│   │   │   ├── amrfinder_runner.py  # Safe subprocess runner for AMRFinderPlus
│   │   │   ├── amrfinder_parser.py  # TSV parser for AMRFinderPlus output
│   │   │   ├── amrfinder_service.py # End-to-end pipeline orchestration
│   │   │   ├── result_service.py    # Result caching & CSV/JSON export
│   │   │   └── visualization_service.py # Contig coordinate track builder
│   │   ├── schemas/
│   │   │   ├── amr_result.py        # Pydantic schema for AmrDetectionResult
│   │   │   ├── analysis.py          # Pydantic schemas for AnalysisResponse & Summary
│   │   │   └── upload.py            # Upload parameter schemas
│   │   ├── config/
│   │   │   └── settings.py          # Environment settings (Pydantic Settings)
│   │   └── utils/
│   │       ├── command_utils.py     # Safe non-shell subprocess execution
│   │       ├── file_utils.py        # Temporary directories & filename sanitization
│   │       └── logging.py           # Structured logger
│   ├── tests/
│   │   ├── fixtures/
│   │   │   └── amrfinder_output.tsv # Unit test fixture (parser validation only)
│   │   ├── test_amrfinder.py
│   │   ├── test_amrfinder_parser.py
│   │   ├── test_api.py
│   │   ├── test_sequence_validator.py
│   │   └── test_upload.py
│   ├── uploads/
│   ├── results/
│   ├── .env
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   └── sample-data/
│   │       └── sample_genome.csv    # Schema format demonstration file
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Card, Button, Badge, Spinner, Alert, EmptyState
│   │   │   ├── layout/              # Sidebar, Header, PageLayout
│   │   │   ├── upload/              # UploadTabs, CsvUploader, FastaUploader, InputFormatCard
│   │   │   ├── analysis/            # ToolSelector, OrganismSelector, ThresholdInputs
│   │   │   └── results/             # AmrGenesTable, SummaryPanel, GenomeVisualization, DownloadResults
│   │   ├── hooks/                   # useAmrAnalysis, useFileUpload
│   │   ├── services/                # api.js, amrApi.js
│   │   ├── utils/                   # validation.js, formatResults.js
│   │   ├── styles/                  # global.css, dashboard.css
│   │   ├── pages/Level1.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 4. Installation & Requirements

### System Requirements
- Python 3.10+
- Node.js 18+ and npm
- NCBI AMRFinderPlus (see installation below)

### Python Dependencies
Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

### Frontend Dependencies
Install React/Vite dependencies:
```bash
cd frontend
npm install
cd ..
```

---

## 5. AMRFinderPlus Installation & Database Setup

NCBI AMRFinderPlus is a curated bioinformatics tool maintained by the National Center for Biotechnology Information (NCBI).

### Option A: Conda / Bioconda (Recommended for Linux/WSL/macOS)
```bash
conda create -n amrfinder -c bioconda -c conda-forge ncbi-amrfinderplus
conda activate amrfinder

# Download the latest curated AMR reference database
amrfinder -u
```

### Option B: Docker
```bash
docker pull ncbi/amr
```

### Option C: WSL (Windows Subsystem for Linux)
On Windows, AMRFinderPlus can be installed inside WSL via Bioconda. The backend runner automatically detects and can interact with `wsl amrfinder` or direct executable paths.

---

## 6. Environment Variables

Create a `backend/.env` file:
```ini
# Path to the amrfinder executable (command name or absolute path)
AMRFINDERPLUS_PATH=amrfinder

# Optional path to local AMRFinder database (defaults to tool's internal database)
# AMRFINDERPLUS_DB=/path/to/amrfinder/data

DEBUG=false
```

---

## 7. Running the Application

### 1. Start the Backend API (FastAPI)
From the workspace root:
```bash
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### 2. Start the Frontend (Vite)
From the `frontend/` directory:
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 8. Input Formats

### CSV Format (Primary)
Header columns must include `isolate_id`, `contig_id`, and `sequence`:
```csv
isolate_id,contig_id,sequence
ISO001,contig_1,ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC...
ISO001,contig_2,TTGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC...
ISO002,contig_1,GGGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC...
```

### FASTA Format (Supported)
```fasta
>ISO001___contig_1
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC...
>ISO002___contig_1
GGGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATC...
```

---

## 9. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint |
| `GET` | `/api/v1/amr/tool-status` | Verifies whether AMRFinderPlus executable is available |
| `POST` | `/api/v1/amr/analyze` | Multipart upload for genomic CSV/FASTA; executes real pipeline |
| `GET` | `/api/v1/amr/results/{id}` | Retrieves structured JSON results for an analysis job |
| `GET` | `/api/v1/amr/results/{id}/csv` | Exports real detected AMR results as a CSV file |
| `GET` | `/api/v1/amr/results/{id}/json` | Exports full analysis output as a JSON file |

---

## 10. Automated Testing

Run the backend test suite:
```bash
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD="1"
$env:PYTHONPATH="backend"
python -m pytest backend/tests -v
```

All unit tests validate:
- Biological sequence validation (IUPAC alphabet, length minimums, rejection of short fragments like `ATGCCCCCCTATTTTT`)
- CSV and FASTA parsers (Polars & BioPython)
- AMRFinderPlus TSV parser (mapping fields to Pydantic models using test fixture)
- Identity & Coverage threshold filtering
- API route status and validation checks

---

## 11. Important Biological Limitations

1. **Curated Reference Database Dependency**: AMRFinderPlus detects resistance determinants through sequence similarity (BLASTX/BLASTN) and profile HMMs against its curated database. Novel or uncataloged resistance mechanisms will not be detected.
2. **Negative Results ("No hits")**: "No AMR determinants detected" means no matching reference sequence was found under the selected thresholds; it is **not** definitive proof of phenotypic antibiotic susceptibility.
3. **Sequence Length Context**: Short sequence fragments (e.g. < 50 bp) do not contain sufficient coding sequence context to perform meaningful gene annotation and are rejected by the validator.
