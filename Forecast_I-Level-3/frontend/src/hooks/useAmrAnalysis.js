import { useState, useEffect, useCallback } from 'react';
import { amrApi } from '../services/amrApi';

export function useAmrAnalysis() {
  const [tool, setTool] = useState('AMRFinderPlus');
  const [organism, setOrganism] = useState('Bacterial (Auto-detect)');
  const [minIdentity, setMinIdentity] = useState('90');
  const [minCoverage, setMinCoverage] = useState('80');

  const [toolStatus, setToolStatus] = useState({ available: null, version: null, message: null });
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'success' | 'error'
  const [statusStep, setStatusStep] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchToolStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await amrApi.getToolStatus();
      setToolStatus(data);
    } catch (err) {
      setToolStatus({
        available: false,
        version: null,
        message: 'Could not connect to backend server. Make sure FastAPI backend is running.'
      });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchToolStatus();
  }, [fetchToolStatus]);

  const runAnalysis = async (file) => {
    if (!file) {
      setError('Please select a genomic sequence file first.');
      return;
    }

    setStatus('running');
    setError(null);
    setAnalysisResult(null);
    setStatusStep('Validating genomic sequences...');

    const timer1 = setTimeout(() => {
      setStatusStep('Running AMRFinderPlus against reference database...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setStatusStep('Parsing AMR annotations and generating contig tracks...');
    }, 2800);

    try {
      const res = await amrApi.runAnalysis({
        file,
        tool,
        organism,
        minIdentity: minIdentity ? parseFloat(minIdentity) : null,
        minCoverage: minCoverage ? parseFloat(minCoverage) : null
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      setAnalysisResult(res);
      setStatus('success');
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setStatus('error');
      setError(err.message || 'An error occurred during analysis.');
    }
  };

  const resetAnalysis = () => {
    setStatus('idle');
    setAnalysisResult(null);
    setError(null);
    setStatusStep('');
  };

  return {
    tool,
    setTool,
    organism,
    setOrganism,
    minIdentity,
    setMinIdentity,
    minCoverage,
    setMinCoverage,
    toolStatus,
    loadingStatus,
    fetchToolStatus,
    status,
    statusStep,
    analysisResult,
    error,
    runAnalysis,
    resetAnalysis
  };
}
