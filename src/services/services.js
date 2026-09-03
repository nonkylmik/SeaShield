import { store } from './appStore.js';
export const vesselService = { getAll: () => store.vessels, getById: id => store.vessel(id) };
export const cameraService = { getAll: () => store.cameras, getByVessel: id => store.cameras.filter(item => item.vesselId === id) };
export const sensorService = { getAll: () => store.sensors, getByVessel: id => store.sensors.filter(item => item.vesselId === id) };
export const eventService = { getRecent: () => store.events, getByVessel: id => store.events.filter(item => item.vesselId === id) };
export const incidentService = { getAll: () => store.incidents, getById: id => store.incidents.find(item => item.incidentId === id), updateStatus: (id, status, notes) => store.updateIncident(id, status, notes) };
export const securityService = { getScore: id => store.vessel(id)?.score ?? null, getFleetStatus: () => store.vessels.reduce((summary, vessel) => { summary[vessel.status] += 1; return summary; }, { SECURE: 0, WARNING: 0, CRITICAL: 0 }) };