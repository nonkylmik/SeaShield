import { scenarioDefinitions } from '../data/mock.js';
import { store } from '../services/appStore.js';

let timer;
export const simulationEngine = {
  start(name) { this.stop(); const definition = scenarioDefinitions[name]; if (!definition) throw new Error('Unknown simulation scenario'); store.scenario = { name: definition.name, status: 'RUNNING', index: 0 }; this.tick(definition); },
  tick(definition) { if (store.scenario.status !== 'RUNNING') return; const step = definition.steps[store.scenario.index]; if (!step) { store.scenario.status = 'COMPLETE'; store.notify(); return; } store.addEvent({ vesselId: definition.vesselId, eventType: step[0], category: step[1], severity: step[2], source: step[3], description: step[4] }); store.scenario.index += 1; timer = setTimeout(() => this.tick(definition), 1800); },
  pause() { if (store.scenario.status === 'RUNNING') { clearTimeout(timer); store.scenario.status = 'PAUSED'; store.notify(); } },
  resume() { const definition = Object.values(scenarioDefinitions).find(item => item.name === store.scenario.name); if (definition && store.scenario.status === 'PAUSED') { store.scenario.status = 'RUNNING'; store.notify(); this.tick(definition); } },
  stop() { clearTimeout(timer); if (store.scenario.status === 'RUNNING' || store.scenario.status === 'PAUSED') { store.scenario.status = 'STOPPED'; store.notify(); } },
  reset() { this.stop(); store.resetSimulation(); store.scenario = { name: '', status: 'IDLE', index: 0 }; store.notify(); }
};