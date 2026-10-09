import React, { useEffect, useState, useCallback } from 'react';
import ControlBar from './components/ControlBar';
import OrganismSummaryCard from './components/OrganismSummaryCard';
import GenotypeMatchCard from './components/GenotypeMatchCard';
import DetectedGenesCard from './components/DetectedGenesCard';
import GenomeVisualizationCard from './components/GenomeVisualizationCard';
import AstPhenotypeCard from './components/AstPhenotypeCard';
import GenotypePhenotypeSummaryCard from './components/GenotypePhenotypeSummaryCard';
import FullGenomeModal from './components/FullGenomeModal';
import './styles/level1.css';

const INTERP_LABEL = {
  CONSISTENT: 'Consistent',
  POSSIBLE_MISMATCH: 'Possible Mismatch',
  NO_GENETIC_EVIDENCE: 'No Genetic Evidence',
  INCONCLUSIVE: 'Inconclusive',
  NO_PHENOTYPE: 'No Phenotype Data',
};

const MATCH_LABEL = {
  CONSISTENT: 'Consistent',
  POSSIBLE_MISMATCH: 'Possible Mismatch',
  NO_GENETIC_EVIDENCE: 'No Genetic Evidence',
  INCONCLUSIVE: 'Inconclusive',
  NO_PHENOTYPE: 'No Phenotype Data',
};

const MATCH_CONCORDANCE = {
  CONSISTENT: 'High Concordance',
  POSSIBLE_MISMATCH: 'Needs Review',
  NO_GENETIC_EVIDENCE: 'Insufficient Genomic Evidence',
  INCONCLUSIVE: 'Inconclusive',
  NO_PHENOTYPE: 'No Phenotype Data',
};

function mapDashboard(dashboard) {
  const isolate = dashboard?.isolate || {};
  const gpItems = dashboard?.genotype_phenotype?.items || [];
  const amrFindings = dashboard?.amr_findings || [];
  const mutationFindings = dashboard?.mutations || [];
  const predictions = dashboard?.predictions || [];

  const predictionMap = {};
  for (const p of predictions) {
    if (p.antibiotic) predictionMap[p.antibiotic] = p;
  }

  const findings = [
    ...amrFindings.map((item, i) => ({
      id: `amr-${i + 1}`,
      type: 'AMR Gene',
      gene: item.gene || '—',
      location: item.location || 'Location unavailable',
      startMb: 0,
      endMb: 0,
      associatedResistance: item.associated_resistance || '—',
    })),
    ...mutationFindings.map((item, i) => ({
      id: `mut-${i + 1}`,
      type: 'Mutation',
      gene: item.display_name || item.gene || '—',
      location: item.location || 'Location unavailable',
      startMb: 0,
      endMb: 0,
      associatedResistance: item.associated_resistance || '—',
    })),
  ];

  const astResults = (dashboard?.ast_results || []).map((item, i) => ({
    id: `ast-${i + 1}`,
    antibiotic: item.antibiotic || '—',
    class: item.class || 'Unclassified',
    result: item.result || '—',
    interpretation: item.interpretation || '—',
    code: item.result || '—',
  }));

  const summaryRows = gpItems.map((item, i) => {
    const pred = predictionMap[item.antibiotic];
    return {
      id: `sum-${i + 1}`,
      antibiotic: item.antibiotic || '—',
      class: item.antibiotic_class || 'Unclassified',
      geneticEvidence: item.genetic_evidence?.length
        ? item.genetic_evidence.join(', ')
        : 'None detected',
      astResultCode: item.ast_result || '—',
      interpretation: INTERP_LABEL[item.interpretation] || item.interpretation || '—',
      mlPrediction: pred?.model_available ? pred.prediction : null,
      mlProbability: pred?.model_available ? pred.probability_resistant : null,
    };
  });

  const overallStatus = dashboard?.genotype_phenotype?.overall_status || 'INCONCLUSIVE';
  const matchStatus = {
    title: 'GENOTYPE ↔ PHENOTYPE MATCH',
    status: MATCH_LABEL[overallStatus] || overallStatus,
    description: dashboard?.key_takeaway || 'Genotype-phenotype concordance analysis result.',
    concordanceLevel: MATCH_CONCORDANCE[overallStatus] || 'Unknown',
    overallStatus,
  };

  const genomeSizeMb = isolate.genome_length_bp
    ? +(isolate.genome_length_bp / 1_000_000).toFixed(2)
    : null;

  return {
    organism: isolate.organism || '—',
    shortName: isolate.organism
      ? isolate.organism.split(' ').slice(0, 2).join(' ')
      : '—',
    isolateId: isolate.isolate_id || '—',
    status: 'Analyzed',
    collectionDate: isolate.collection_date || '—',
    biosampleId: isolate.genome_id || '—',
    assembly: isolate.assembly_status || '—',
    genomeSizeMb,
    stats: {
      amrGenesDetected: isolate.amr_gene_count ?? '—',
      resistanceMutations: isolate.mutation_count ?? '—',
      antibioticsTested: isolate.antibiotics_tested ?? '—',
    },
    matchStatus,
    findings,
    astResults,
    summaryRows,
  };
}

export default function Level1Module() {
  const [organisms, setOrganisms] = useState([]);
  const [isolates, setIsolates] = useState([]);
  const [selectedOrganism, setSelectedOrganism] = useState('');
  const [selectedIsolate, setSelectedIsolate] = useState('');

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [organismsLoading, setOrganismsLoading] = useState(true);
  const [isolatesLoading, setIsolatesLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setOrganismsLoading(true);
      try {
        let res = await fetch('/api/level1/organisms');
        if (!res.ok) {
          res = await fetch('/api/v1/organisms');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.organisms || [];
        setOrganisms(list);
        if (list.length) setSelectedOrganism(list[0]);
      } catch (e) {
        setError(`Level 1 Backend unavailable: ${e.message}`);
      } finally {
        setOrganismsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedOrganism) return;
    const load = async () => {
      setIsolatesLoading(true);
      setDashboardData(null);
      setError('');
      try {
        let res = await fetch(`/api/level1/isolates?organism=${encodeURIComponent(selectedOrganism)}`);
        if (!res.ok) {
          res = await fetch(`/api/v1/isolates?organism=${encodeURIComponent(selectedOrganism)}`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const ids = (data.isolates || []).map((item) => item.isolate_id).filter(Boolean);
        setIsolates(ids);
        setSelectedIsolate(ids[0] || '');
      } catch (e) {
        setError(`Failed to load isolates: ${e.message}`);
        setIsolates([]);
        setSelectedIsolate('');
      } finally {
        setIsolatesLoading(false);
      }
    };
    load();
  }, [selectedOrganism]);

  const fetchDashboard = useCallback(async (isolateId) => {
    if (!isolateId) return;
    setIsLoading(true);
    setDashboardData(null);
    setError('');
    try {
      let res = await fetch(`/api/level1/dashboard/${isolateId}`);
      if (!res.ok) {
        res = await fetch(`/api/v1/level1/dashboard/${isolateId}`);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDashboardData(data);
    } catch (e) {
      setError(`Failed to load analysis for ${isolateId}: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(selectedIsolate);
  }, [selectedIsolate, fetchDashboard]);

  const handleAnalyze = () => {
    if (selectedIsolate) fetchDashboard(selectedIsolate);
  };

  const currentIsolateData = dashboardData ? mapDashboard(dashboardData) : null;

  return (
    <div className="level1-module">
      <div className="page-title-section">
        <div className="eyebrow">AMR PREDICTION <span>—</span> GENOMIC INTELLIGENCE</div>
        <h1>Genotype–Phenotype <span>Prediction Analysis</span></h1>
        <p>
          Analyze bacterial genomes and <strong>connect</strong> genetic findings with laboratory resistance profiles.
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
        </div>
      )}

      <ControlBar
        selectedOrganism={selectedOrganism}
        setSelectedOrganism={setSelectedOrganism}
        selectedIsolate={selectedIsolate}
        setSelectedIsolate={setSelectedIsolate}
        onAnalyze={handleAnalyze}
        organisms={organisms}
        isolates={isolates}
        organismsLoading={organismsLoading}
        isolatesLoading={isolatesLoading}
      />

      {isLoading && (
        <div className="card loading-card">
          <div className="loading-spinner" />
          <p className="loading-text">Loading analysis for <strong>{selectedIsolate}</strong>…</p>
        </div>
      )}

      {!isLoading && !currentIsolateData && !error && (
        <div className="card empty-state-card">
          <p>Select an organism and isolate, then click <strong>Analyze</strong>.</p>
        </div>
      )}

      {!isLoading && !currentIsolateData && error && (
        <div className="card empty-state-card">
          <p>No analysis data available. Check that the unified backend server is running.</p>
        </div>
      )}

      {!isLoading && currentIsolateData && (
        <>
          <div className="grid-2-col-asymmetric">
            <OrganismSummaryCard isolateData={currentIsolateData} />
            <GenotypeMatchCard matchStatus={currentIsolateData.matchStatus} />
          </div>

          <div className="grid-2-col-asymmetric">
            <DetectedGenesCard findings={currentIsolateData.findings} />
            <GenomeVisualizationCard
              findings={currentIsolateData.findings}
              isolateData={currentIsolateData}
              onViewFullGenome={() => setIsModalOpen(true)}
            />
          </div>

          <div className="grid-2-col">
            <AstPhenotypeCard astResults={currentIsolateData.astResults} />
            <GenotypePhenotypeSummaryCard
              summaryRows={currentIsolateData.summaryRows}
              concordanceLevel={currentIsolateData.matchStatus.concordanceLevel}
            />
          </div>
        </>
      )}

      <FullGenomeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isolateData={currentIsolateData}
      />
    </div>
  );
}
