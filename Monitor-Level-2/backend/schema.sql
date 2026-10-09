-- ============================================================================
-- ANTIMICROBIAL RESISTANCE (AMR) SURVEILLANCE DATABASE SCHEMA
-- Compatible with PostgreSQL 12+
-- ============================================================================

-- Optional: Create Database (run separately if needed)
-- CREATE DATABASE amr_surveillance_db;

-- ----------------------------------------------------------------------------
-- 1. UPLOAD BATCHES TABLE (Metadata for each uploaded CSV file / quarterly period)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_batches (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    period_label VARCHAR(100),                -- e.g., '2025_Q1', '2025_Q2'
    total_rows INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- 2. AMR ISOLATES TABLE (Core Surveillance Data)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amr_isolates (
    id BIGSERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES upload_batches(id) ON DELETE CASCADE,
    
    -- Core Required Attributes
    sample_date DATE NOT NULL,
    organism VARCHAR(150) NOT NULL,
    antibiotic VARCHAR(100) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    ast_result CHAR(1) NOT NULL CHECK (ast_result IN ('R', 'S', 'I')), -- R: Resistant, S: Susceptible, I: Intermediate
    
    -- Clinical Context & De-duplication Attributes
    patient_id VARCHAR(100),                  -- Hashed / Anonymized patient ID for de-duplication
    specimen_type VARCHAR(100),               -- e.g., 'Blood', 'Urine', 'Sputum', 'Wound'
    mic_value VARCHAR(50),                    -- Minimum Inhibitory Concentration or disk diffusion zone (mm)
    
    -- Ingestion Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES (Optimized for filtering & surveillance analytics)
-- ----------------------------------------------------------------------------

-- Index for primary 3-way combination queries (Pathogen + Drug + Ward)
CREATE INDEX IF NOT EXISTS idx_amr_combination 
    ON amr_isolates (organism, antibiotic, ward);

-- Index for chronological queries and monthly trend analysis
CREATE INDEX IF NOT EXISTS idx_amr_sample_date 
    ON amr_isolates (sample_date);

-- Index for AST phenotype filtering (R, S, I)
CREATE INDEX IF NOT EXISTS idx_amr_ast_result 
    ON amr_isolates (ast_result);

-- Index for batch association and cascade operations
CREATE INDEX IF NOT EXISTS idx_amr_batch_id 
    ON amr_isolates (batch_id);

-- Composite index for fast resistance rate aggregation by date
CREATE INDEX IF NOT EXISTS idx_amr_date_org_anti 
    ON amr_isolates (sample_date, organism, antibiotic);

-- ----------------------------------------------------------------------------
-- 4. ANALYTICAL VIEWS
-- ----------------------------------------------------------------------------

-- View: Monthly Resistance Trend by Organism, Antibiotic, and Ward
CREATE OR REPLACE VIEW v_amr_monthly_trends AS
SELECT 
    TO_CHAR(sample_date, 'YYYY-MM') AS month_year,
    organism,
    antibiotic,
    ward,
    COUNT(*) AS total_tested,
    COUNT(*) FILTER (WHERE ast_result = 'R') AS resistant_count,
    COUNT(*) FILTER (WHERE ast_result = 'S') AS susceptible_count,
    COUNT(*) FILTER (WHERE ast_result = 'I') AS intermediate_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ast_result = 'R')::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE ast_result IN ('R', 'S')), 0)) * 100, 
        2
    ) AS resistance_rate_pct
FROM amr_isolates
GROUP BY TO_CHAR(sample_date, 'YYYY-MM'), organism, antibiotic, ward;

-- View: Overall Department / Ward Risk Summary
CREATE OR REPLACE VIEW v_amr_ward_summary AS
SELECT 
    ward,
    COUNT(*) AS total_isolates,
    COUNT(*) FILTER (WHERE ast_result = 'R') AS resistant_count,
    COUNT(*) FILTER (WHERE ast_result = 'S') AS susceptible_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ast_result = 'R')::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE ast_result IN ('R', 'S')), 0)) * 100, 
        2
    ) AS resistance_rate_pct
FROM amr_isolates
GROUP BY ward;
