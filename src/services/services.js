import { store } from './appStore.js';
import { apiClient } from './api/client.js';

const mapVessel = vessel => ({ ...vessel, baseScore: vessel.base_score, lastCommunication: vessel.last_communication });
const mapCamera = camera => ({ ...camera, vesselId: camera.vessel_id, lastHeartbeat: camera.last_heartbeat });
const mapEvent = event => ({ ...event, eventId: event.event_id, vesselId: event.vessel_id, eventType: event.event_type });
const mapIncident = incident => ({ ...incident, incidentId: incident.incident_id, vesselId: incident.vessel_id, createdAt: incident.created_at, updatedAt: incident.updated_at, relatedEvents: incident.related_event_ids, affectedSystems: incident.affected_systems, assignedOperator: incident.assigned_operator, investigationNotes: incident.investigation_notes, recommendedAction: incident.recommended_action });

export const api = {
	client: apiClient,
	async loadState() {
		const [health, vessels, cameras, events, incidents, scenario] = await Promise.all([apiClient.getHealth(), apiClient.getVessels(), apiClient.getCameras(), apiClient.getEvents(), apiClient.getIncidents(), apiClient.getSimulationStatus()]);
		return { health, vessels: vessels.map(mapVessel), cameras: cameras.map(mapCamera), events: events.map(mapEvent), incidents: incidents.map(mapIncident), scenario };
	},
	mapIncident
};
export const vesselService = { getAll: () => store.vessels, getById: id => store.vessel(id) };
export const cameraService = { getAll: () => store.cameras, getByVessel: id => store.cameras.filter(item => item.vesselId === id) };
export const sensorService = { getAll: () => store.sensors, getByVessel: id => store.sensors.filter(item => item.vesselId === id) };
export const eventService = { getRecent: () => store.events, getByVessel: id => store.events.filter(item => item.vesselId === id) };
export const incidentService = { getAll: () => store.incidents, getById: id => store.incidents.find(item => item.incidentId === id), updateStatus: (id, status, notes) => store.updateIncident(id, status, notes) };
export const securityService = { getScore: id => store.vessel(id)?.score ?? null, getFleetStatus: () => store.vessels.reduce((summary, vessel) => { summary[vessel.status] += 1; return summary; }, { SECURE: 0, WARNING: 0, CRITICAL: 0 }) };