const rules = [
  { type: 'POTENTIAL_NETWORK_INTRUSION', title: 'Potential Network Intrusion', match: ['UNKNOWN_DEVICE_DETECTED', 'FAILED_AUTHENTICATION', 'SUSPICIOUS_OUTBOUND_TRAFFIC'], severity: 'CRITICAL', systems: ['Network', 'Identity Gateway', 'Firewall'] },
  { type: 'POTENTIAL_PHYSICAL_BREACH', title: 'Potential Physical Security Breach', match: ['UNAUTHORIZED_DOOR_ACCESS', 'CAMERA_OFFLINE'], severity: 'HIGH', systems: ['Access Control', 'CCTV'] },
  { type: 'NAVIGATION_COMMUNICATION_ANOMALY', title: 'Navigation / Communication Anomaly', match: ['GPS_ANOMALY', 'AIS_ANOMALY', 'COMMUNICATION_LOSS'], severity: 'HIGH', systems: ['GPS', 'AIS', 'Communications'] }
];
export function correlateEvents(events, vesselId) {
  return rules.find(rule => rule.match.every(type => events.some(event => event.vesselId === vesselId && event.eventType === type && event.status !== 'RESOLVED')));
}