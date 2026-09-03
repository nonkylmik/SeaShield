export interface Vessel {
  id: string;
  name: string;
  imo: string;
  base_score: number;
  score: number;
  status: 'SECURE' | 'WARNING' | 'CRITICAL';
  last_communication: string;
}

export interface Camera {
  id: string;
  vessel_id: string;
  location: string;
  online: boolean;
  recording: boolean;
  last_heartbeat: string;
}

export interface SecurityEvent {
  id?: number;
  event_id: string;
  timestamp: string;
  vessel_id: string;
  event_type: string;
  category: 'PHYSICAL' | 'CYBER' | 'VESSEL_SYSTEM' | 'ENVIRONMENTAL';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  title: string | null;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  confidence: number | null;
  scenario: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface Incident {
  incident_id: string;
  vessel_id: string;
  type: string;
  title: string;
  severity: SecurityEvent['severity'];
  status: 'NEW' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'FALSE POSITIVE';
  created_at: string;
  updated_at: string;
  description: string;
  related_event_ids: string[];
  affected_systems: string[];
  assigned_operator: string;
  investigation_notes: string;
  recommended_action: string;
}

export interface SecurityState {
  vessel_id: string;
  score: number;
  status: Vessel['status'];
}

export interface SimulationStatus {
  scenario: string | null;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETE';
  index: number;
}
