import { store } from '../services/appStore.js';
import { apiClient } from '../services/api/client.js';

let timer;
export const simulationEngine = {
  async start(name) { clearTimeout(timer); await apiClient.startScenario({ cyber: 'cyber-intrusion', physical: 'physical-breach', systems: 'navigation-anomaly', fire: 'fire-emergency' }[name] || name); await store.refresh(); this.schedule(); },
  async tick() { if (store.scenario.status !== 'RUNNING') return; await apiClient.nextSimulationStep(); await store.refresh(); this.schedule(); },
  schedule() { clearTimeout(timer); if (store.scenario.status === 'RUNNING') timer = setTimeout(() => this.tick(), 1800); },
  async pause() { clearTimeout(timer); await apiClient.pauseSimulation(); await store.refresh(); },
  async resume() { await apiClient.resumeSimulation(); await store.refresh(); this.schedule(); },
  async stop() { clearTimeout(timer); await apiClient.stopSimulation(); await store.refresh(); },
  async reset() { clearTimeout(timer); await apiClient.resetSimulation(); await store.refresh(); }
};