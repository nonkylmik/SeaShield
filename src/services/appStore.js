import { mockVessels, mockCameras, mockSensors, mockAccessEvents, seedEvents } from '../data/mock.js';
import { calculateSecurityScore } from '../utils/securityScore.js';
import { correlateEvents } from '../simulation/correlationEngine.js';

const now = () => new Date().toISOString().slice(11, 19) + ' UTC';
let nextId = 1;
export const store = {
  active: 'Dashboard', selectedVessel: 'all', vessels: structuredClone(mockVessels), cameras: structuredClone(mockCameras), sensors: structuredClone(mockSensors), accessEvents: structuredClone(mockAccessEvents), events: structuredClone(seedEvents), incidents: [], notifications: [], listeners: new Set(), scenario: { name: '', status: 'IDLE', index: 0 },
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); },
  notify() { this.listeners.forEach(listener => listener(this)); },
  vessel(id) { return this.vessels.find(item => item.id === id); },
  addNotification(title, message, severity = 'INFO', relatedId = '') { this.notifications.unshift({ id: `note-${nextId++}`, title, message, severity, relatedId, read: false, timestamp: now() }); },
  addEvent({ vesselId, eventType, category, severity, source, description }) {
    const event = { eventId: `evt-${nextId++}`, timestamp: now(), vesselId, eventType, category, severity, source, description, status: 'OPEN' };
    this.events.unshift(event);
    if (eventType === 'CAMERA_OFFLINE') { const camera = this.cameras.find(item => item.vesselId === vesselId && item.id === 'cam-17') || this.cameras.find(item => item.vesselId === vesselId); if (camera) { camera.online = false; camera.recording = false; } }
    if (eventType === 'CAMERA_RESTORED') this.cameras.filter(item => item.vesselId === vesselId).forEach(camera => { camera.online = true; camera.recording = true; });
    const rule = correlateEvents(this.events, vesselId);
    if (rule && !this.incidents.some(incident => incident.vesselId === vesselId && incident.type === rule.type && incident.status !== 'RESOLVED')) this.createIncident(vesselId, rule, event.eventId);
    this.recalculate(); this.addNotification(`${severity} security event`, description, severity, event.eventId); this.notify(); return event;
  },
  createIncident(vesselId, rule, relatedEventId) { const relatedEvents = this.events.filter(event => event.vesselId === vesselId && rule.match.includes(event.eventType)).map(event => event.eventId); if (!relatedEvents.includes(relatedEventId)) relatedEvents.push(relatedEventId); const incident = { incidentId: `INC-${String(241 + this.incidents.length).padStart(4, '0')}`, vesselId, type: rule.type, title: rule.title, severity: rule.severity, status: 'NEW', createdAt: now(), updatedAt: now(), description: `Rule-based correlation matched ${rule.title.toLowerCase()}.`, relatedEvents, affectedSystems: rule.systems, assignedOperator: 'J. Dawson', investigationNotes: '', recommendedAction: 'Review related events and confirm containment.' }; this.incidents.unshift(incident); this.addNotification(`${rule.severity} incident created`, `${rule.title} · ${this.vessel(vesselId)?.name || 'Unknown vessel'}`, rule.severity, incident.incidentId); return incident; },
  updateIncident(id, status, notes = '') { const incident = this.incidents.find(item => item.incidentId === id); if (!incident) return false; incident.status = status; incident.updatedAt = now(); incident.investigationNotes = notes || incident.investigationNotes; if (status === 'RESOLVED' || status === 'FALSE_POSITIVE') this.events.filter(event => incident.relatedEvents.includes(event.eventId)).forEach(event => { event.status = 'RESOLVED'; }); this.recalculate(); this.addNotification('Incident updated', `${incident.incidentId} is now ${status}`, 'INFO', id); this.notify(); return true; },
  recalculate() { this.vessels.forEach(vessel => { vessel.score = calculateSecurityScore(vessel, this.events, this.incidents); vessel.status = vessel.score < 60 ? 'CRITICAL' : vessel.score < 85 ? 'WARNING' : 'SECURE'; }); },
  markNotificationsRead() { this.notifications.forEach(note => { note.read = true; }); this.notify(); }
  ,resetSimulation() { this.events = structuredClone(seedEvents); this.incidents = []; this.notifications = []; this.cameras = structuredClone(mockCameras); this.vessels = structuredClone(mockVessels); this.recalculate(); this.notify(); }
};
store.recalculate();