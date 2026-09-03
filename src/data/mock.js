const vessel = (id, name, imo, score = 92) => ({ id, name, imo, status: 'SECURE', baseScore: score, score, lastCommunication: '14:32:08 UTC' });

export const mockVessels = [
  vessel('northstar', 'MV Northstar', 'IMO 9384751', 98),
  vessel('meridian', 'MV Meridian', 'IMO 9410283', 94),
  vessel('calypso', 'MV Calypso', 'IMO 9521846', 81),
  vessel('aegis', 'MV Aegis', 'IMO 9673052', 96)
];

export const mockCameras = [
  ['cam-01', 'northstar', 'Bridge'], ['cam-02', 'northstar', 'Main Deck'], ['cam-03', 'northstar', 'Cargo Area'], ['cam-04', 'northstar', 'Engine Room'],
  ['cam-05', 'meridian', 'Port Side'], ['cam-06', 'meridian', 'Starboard Side'], ['cam-07', 'meridian', 'Stern'], ['cam-08', 'meridian', 'Entrance'],
  ['cam-17', 'calypso', 'Cargo Area'], ['cam-18', 'calypso', 'Main Deck'], ['cam-19', 'aegis', 'Bridge'], ['cam-20', 'aegis', 'Entrance']
].map(([id, vesselId, location]) => ({ id, vesselId, location, online: true, recording: true, lastHeartbeat: '14:32:08 UTC' }));

export const mockSensors = ['Fire', 'Smoke', 'Temperature', 'Water', 'Motion', 'Door', 'Bilge'].flatMap((type, index) => [0, 1].map(offset => ({ id: `sensor-${index}-${offset}`, vesselId: mockVessels[(index + offset) % mockVessels.length].id, type, online: true, value: type === 'Temperature' ? '21.4 C' : 'Normal' })));

export const mockAccessEvents = [
  { id: 'access-001', vesselId: 'northstar', type: 'AUTHORIZED', area: 'Crew entrance', actor: 'ID 00482', timestamp: '14:04:33 UTC' },
  { id: 'access-002', vesselId: 'calypso', type: 'DENIED', area: 'Restricted cargo area', actor: 'Unknown badge', timestamp: '14:32:08 UTC' }
];

export const seedEvents = [
  { eventId: 'evt-seed-1', timestamp: '14:32:08 UTC', vesselId: 'calypso', eventType: 'UNAUTHORIZED_DOOR_ACCESS', category: 'PHYSICAL', severity: 'MEDIUM', source: 'Access Control', description: 'Unauthorized access attempt at restricted cargo area.', status: 'RESOLVED' },
  { eventId: 'evt-seed-2', timestamp: '14:27:41 UTC', vesselId: 'calypso', eventType: 'UNKNOWN_DEVICE_DETECTED', category: 'CYBER', severity: 'HIGH', source: 'Network Monitor', description: 'Unknown device detected on network segment 04.', status: 'RESOLVED' },
  { eventId: 'evt-seed-3', timestamp: '14:19:06 UTC', vesselId: 'northstar', eventType: 'CAMERA_RESTORED', category: 'PHYSICAL', severity: 'INFO', source: 'CCTV', description: 'Engine Room camera connection restored.', status: 'RESOLVED' },
  { eventId: 'evt-seed-4', timestamp: '13:58:12 UTC', vesselId: 'calypso', eventType: 'FIREWALL_BLOCK', category: 'CYBER', severity: 'HIGH', source: 'Firewall', description: 'Outbound traffic blocked by policy.', status: 'RESOLVED' }
];

export const scenarioDefinitions = {
  cyber: { name: 'Cyber Intrusion', vesselId: 'calypso', steps: [
    ['UNKNOWN_DEVICE_DETECTED', 'CYBER', 'HIGH', 'Network Monitor', 'Unknown device detected on network segment 04.'],
    ['FAILED_AUTHENTICATION', 'CYBER', 'MEDIUM', 'Identity Gateway', 'Multiple failed authentication attempts detected.'],
    ['SUSPICIOUS_OUTBOUND_TRAFFIC', 'CYBER', 'HIGH', 'Network Monitor', 'Suspicious outbound traffic pattern observed.'],
    ['FIREWALL_BLOCK', 'CYBER', 'HIGH', 'Firewall', 'Outbound traffic blocked by policy.']
  ]},
  physical: { name: 'Physical Breach', vesselId: 'calypso', steps: [
    ['UNAUTHORIZED_DOOR_ACCESS', 'PHYSICAL', 'HIGH', 'Access Control', 'Unauthorized door access in the restricted cargo area.'],
    ['CAMERA_OFFLINE', 'PHYSICAL', 'HIGH', 'CCTV', 'Nearby camera CAM-17 stopped responding.']
  ]},
  systems: { name: 'Vessel Systems Anomaly', vesselId: 'meridian', steps: [
    ['GPS_ANOMALY', 'VESSEL_SYSTEM', 'MEDIUM', 'GPS', 'GPS position variance exceeds expected tolerance.'],
    ['AIS_ANOMALY', 'VESSEL_SYSTEM', 'MEDIUM', 'AIS', 'AIS identity or position report is inconsistent.'],
    ['COMMUNICATION_LOSS', 'VESSEL_SYSTEM', 'HIGH', 'Edge Gateway', 'Communication instability detected with vessel edge gateway.']
  ]}
};