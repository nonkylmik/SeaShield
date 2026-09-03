import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSecurityScore } from '../src/utils/securityScore.js';
import { correlateEvents } from '../src/simulation/correlationEngine.js';

const vessel = { id: 'test-vessel', baseScore: 92 };
const event = (eventType, severity = 'HIGH', status = 'OPEN') => ({ vesselId: vessel.id, eventType, severity, status });

test('security score stays within bounds and recovers when records resolve', () => {
  const active = [event('FIRE_ALARM', 'CRITICAL')];
  const score = calculateSecurityScore(vessel, active, []);
  const recovered = calculateSecurityScore(vessel, [{ ...active[0], status: 'RESOLVED' }], []);
  assert.equal(score, 57);
  assert.equal(recovered, 92);
  assert.ok(score >= 0 && score <= 100);
});

test('correlation detects a complete cyber intrusion chain', () => {
  const events = ['UNKNOWN_DEVICE_DETECTED', 'FAILED_AUTHENTICATION', 'SUSPICIOUS_OUTBOUND_TRAFFIC'].map(type => event(type));
  const rule = correlateEvents(events, vessel.id);
  assert.equal(rule.type, 'POTENTIAL_NETWORK_INTRUSION');
  assert.equal(rule.severity, 'CRITICAL');
});

test('correlation does not fire across vessels', () => {
  const events = ['UNKNOWN_DEVICE_DETECTED', 'FAILED_AUTHENTICATION', 'SUSPICIOUS_OUTBOUND_TRAFFIC'].map(type => event(type));
  events[2].vesselId = 'other-vessel';
  assert.equal(correlateEvents(events, vessel.id), undefined);
});