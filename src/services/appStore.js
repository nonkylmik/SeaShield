import { apiClient } from './api/client.js';
import { ApiError } from './api/client.js';

const mapVessel = vessel => ({ ...vessel, baseScore: vessel.base_score, lastCommunication: vessel.last_communication });
const mapCamera = camera => ({ ...camera, vesselId: camera.vessel_id, lastHeartbeat: camera.last_heartbeat });
const mapEvent = event => ({ ...event, eventId: event.event_id, vesselId: event.vessel_id, eventType: event.event_type });
const mapIncident = incident => ({ ...incident, incidentId: incident.incident_id, vesselId: incident.vessel_id, createdAt: incident.created_at, updatedAt: incident.updated_at, relatedEvents: incident.related_event_ids, affectedSystems: incident.affected_systems, assignedOperator: incident.assigned_operator, investigationNotes: incident.investigation_notes, recommendedAction: incident.recommended_action });
export const store = {
  active: 'Dashboard', selectedVessel: 'all', vessels: [], cameras: [], sensors: [], accessEvents: [], events: [], incidents: [], notifications: [], listeners: new Set(), scenario: { name: '', status: 'IDLE', index: 0 }, loading: true, error: '', backend: { status: 'offline', mode: 'unknown', version: '' }, authLoading: true, authenticated: false, user: null, authError: '', pollTimer: null, refreshInFlight: false,
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); },
  notify() { this.listeners.forEach(listener => listener(this)); },
  vessel(id) { return this.vessels.find(item => item.id === id); },
  async initializeAuth() { try { this.user = await apiClient.getCurrentUser(); this.authenticated = true; await this.refresh({ initial: true }); this.startPolling(); } catch { this.authenticated = false; this.loading = false; } finally { this.authLoading = false; this.notify(); } },
  async login(email, password) { this.authError = ''; try { const result = await apiClient.login(email, password); this.user = result.user; this.authenticated = true; await this.refresh({ initial: true }); this.startPolling(); } catch (error) { this.authError = error.message; this.authenticated = false; throw error; } finally { this.authLoading = false; this.notify(); } },
  async logout() { await apiClient.logout(); if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; } this.authenticated = false; this.user = null; this.vessels = []; this.events = []; this.incidents = []; this.notify(); },
  async refresh({ initial = false } = {}) {
    if (this.refreshInFlight) return;
    this.refreshInFlight = true;
    if (initial) { this.loading = true; this.error = ''; this.notify(); }
    try {
      const [health, vessels, cameras, events, incidents, scenario] = await Promise.all([apiClient.getHealth(), apiClient.getVessels(), apiClient.getCameras(), apiClient.getEvents(), apiClient.getIncidents(), apiClient.getSimulationStatus()]);
      const previousEventIds = new Set(this.events.map(event => event.eventId));
      const previousIncidentIds = new Set(this.incidents.map(incident => incident.incidentId));
      this.vessels = vessels.map(mapVessel); this.cameras = cameras.map(mapCamera); this.events = events.map(mapEvent); this.incidents = incidents.map(mapIncident); this.scenario = { ...scenario, name: scenario.scenario || '' }; this.backend = health; this.error = ''; this.loading = false;
      this.events.filter(event => !previousEventIds.has(event.eventId)).forEach(event => this.addNotification(`${event.severity} security event`, event.description, event.severity, event.eventId));
      this.incidents.filter(incident => !previousIncidentIds.has(incident.incidentId)).forEach(incident => this.addNotification(`${incident.severity} incident created`, incident.title, incident.severity, incident.incidentId));
      this.notify();
    } catch (error) { this.loading = false; this.error = error instanceof ApiError ? error.message : 'The SeaShield backend is unavailable.'; this.backend = { status: 'offline', mode: 'unknown', version: '' }; this.notify(); }
    finally { this.refreshInFlight = false; }
  },
  startPolling(intervalMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS || 2000)) { if (!this.pollTimer) this.pollTimer = setInterval(() => this.refresh(), intervalMs); },
  addNotification(title, message, severity = 'INFO', relatedId = '') { this.notifications.unshift({ id: `${relatedId}-${Date.now()}`, title, message, severity, relatedId, read: false, timestamp: new Date().toISOString() }); },
  async updateIncident(id, status, notes = '') { await apiClient.updateIncident(id, status, notes); await this.refresh(); return true; },
  markNotificationsRead() { this.notifications.forEach(note => { note.read = true; }); this.notify(); }
};