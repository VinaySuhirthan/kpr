const API_BASE_URL = import.meta.env.VITE_API_URL || ''

async function getJson(path) {
  const level4Path = `/api/level4${path.startsWith('/') ? '' : '/'}${path}`
  let response
  try {
    response = await fetch(level4Path)
  } catch (err) {
    if (API_BASE_URL) {
      response = await fetch(`${API_BASE_URL}${path}`)
    } else {
      throw err
    }
  }

  if (!response.ok && response.status === 404 && API_BASE_URL) {
    response = await fetch(`${API_BASE_URL}${path}`)
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(
      detail?.detail || `API request failed (${response.status})`,
    )
  }
  return response.json()
}

export const api = {
  forecasts: () => getJson('/api/forecast'),
  forecast: (organism, ward, antibiotic) =>
    getJson(
      `/api/forecast/${encodeURIComponent(organism)}/${encodeURIComponent(ward)}/${encodeURIComponent(antibiotic)}`,
    ),
  summary: () => getJson('/api/summary'),
  risks: () => getJson('/api/surveillance/risks'),
  trends: (organism, ward, antibiotic) => {
    const params = new URLSearchParams({ organism, ward, antibiotic })
    return getJson(`/api/surveillance/trends?${params}`)
  },
  relationships: () => getJson('/api/relationships'),
}
