const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function request(endpoint, options = {}) {
  const targetPath = endpoint.startsWith('/api/level3')
    ? endpoint
    : `/api/level3${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let response;
  try {
    response = await fetch(targetPath, options);
  } catch (err) {
    if (API_BASE_URL) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    } else {
      throw err;
    }
  }

  if (!response.ok && response.status === 404 && API_BASE_URL) {
    response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // response was not JSON
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export { API_BASE_URL };
