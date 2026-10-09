# AMR Surveillance Dashboard

The React dashboard in `frontend/` uses the Express API in `backend/` to store and retrieve uploaded surveillance data in PostgreSQL. Uploaded rows are not persisted in browser storage.

## Project structure

- `frontend/` — React/Vite application, static assets, and frontend dependencies.
- `backend/` — Express API, PostgreSQL integration, backend dependencies, and database schema.

## Run locally

1. Create/configure a PostgreSQL database and copy `backend/.env.example` to `backend/.env`. Set the PostgreSQL connection settings for your database.
2. In a terminal, install backend dependencies and start the API:

   ```sh
   cd backend
   npm ci
   npm run dev
   ```

   The API listens on port `5000` by default and creates its tables on startup.
3. In a separate terminal, install frontend dependencies and start the dashboard:

   ```sh
   cd frontend
   npm ci
   npm run dev
   ```

   Vite proxies `/api` requests to `http://localhost:5000`.

To create a production frontend build, run `npm run build` from `frontend/`.

The CSV must include `date`, `organism`, `antibiotic`, `ward`, and `ast_result` columns. `ast_result` accepts `R`/`Resistant`, `S`/`Susceptible`, or `I`/`Intermediate`. Optional `patient_id`, `specimen_type`, and `mic_value` columns are stored when present.

The dashboard loads saved batches and isolate records from the API on startup. Uploading stores data in PostgreSQL; resetting the dashboard deletes the saved data through the API.
