const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 8000);

class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(body?.detail || `Request failed (${response.status})`, response.status);
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The SeaShield API request timed out.');
    if (error instanceof ApiError) throw error;
    console.error('[SeaShield API]', error);
    throw new ApiError('The SeaShield backend is unavailable.');
  } finally {
    clearTimeout(timeout);
  }
}

const post = (path, body) => request(path, body === undefined ? { method: 'POST' } : { method: 'POST', body: JSON.stringify(body) });

export const apiClient = {
  baseUrl: API_URL,
  getHealth: () => request('/health'),
  getVessels: () => request('/api/v1/vessels'),
  getEvents: () => request('/api/security-events'),
  getIncidents: () => request('/api/v1/incidents'),
  getCameras: () => request('/api/v1/cameras'),
  getSecurity: vesselId => request(`/security/${encodeURIComponent(vesselId)}`),
  startSimulation: scenario => post('/api/v1/simulation/start', { scenario }),
  pauseSimulation: () => post('/api/v1/simulation/pause'),
  resumeSimulation: () => post('/api/v1/simulation/resume'),
  stopSimulation: () => post('/api/v1/simulation/stop'),
  resetSimulation: () => post('/api/v1/simulation/reset'),
  nextSimulationStep: () => post('/api/v1/simulation/next'),
  getSimulationStatus: () => request('/api/v1/simulation/status'),
  startScenario: scenario => post(`/api/v1/simulation/scenario/${encodeURIComponent(scenario)}/start`),
  updateIncident: (incidentId, status, notes = '') => request(`/api/v1/incidents/${encodeURIComponent(incidentId)}`, { method: 'PATCH', body: JSON.stringify({ status, investigation_notes: notes }) })
};

export { ApiError };
