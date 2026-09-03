const penalties = { INFO: 0, LOW: 4, MEDIUM: 10, HIGH: 20, CRITICAL: 35 };
export function calculateSecurityScore(vessel, events, incidents) {
  const eventPenalty = events.filter(event => event.vesselId === vessel.id && event.status !== 'RESOLVED').reduce((sum, event) => sum + penalties[event.severity], 0);
  const incidentPenalty = incidents.filter(incident => incident.vesselId === vessel.id && !['RESOLVED', 'FALSE_POSITIVE'].includes(incident.status)).reduce((sum, incident) => sum + penalties[incident.severity], 0);
  return Math.max(0, Math.min(100, vessel.baseScore - Math.min(45, eventPenalty + incidentPenalty)));
}