import { request, API_BASE_URL } from './api';

export const amrApi = {
  async getToolStatus() {
    return request('/api/v1/amr/tool-status');
  },

  async runAnalysis({ file, tool, organism, minIdentity, minCoverage }) {
    const formData = new FormData();
    formData.append('file', file);
    if (tool) formData.append('tool', tool);
    if (organism && organism !== 'Bacterial (Auto-detect)') {
      formData.append('organism', organism);
    }
    if (minIdentity !== null && minIdentity !== undefined && minIdentity !== '') {
      formData.append('min_identity', minIdentity);
    }
    if (minCoverage !== null && minCoverage !== undefined && minCoverage !== '') {
      formData.append('min_coverage', minCoverage);
    }

    return request('/api/v1/amr/analyze', {
      method: 'POST',
      body: formData,
    });
  },

  async getResults(analysisId) {
    return request(`/api/v1/amr/results/${analysisId}`);
  },

  getCsvDownloadUrl(analysisId) {
    return `${API_BASE_URL}/api/v1/amr/results/${analysisId}/csv`;
  },

  getJsonDownloadUrl(analysisId) {
    return `${API_BASE_URL}/api/v1/amr/results/${analysisId}/json`;
  }
};
