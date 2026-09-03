from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models.incidents import IncidentUpdate
from simulation.simulation_engine import SimulationEngine

class ScenarioRequest(BaseModel):
    scenario: str


app = FastAPI(title="SeaShield Security API", version="1.6.0", description="Simulation-only maritime security backend.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:4173", "http://localhost:5173", "http://127.0.0.1:4173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
engine = SimulationEngine(seed=7)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "online", "mode": "simulation", "version": "1.5.0"}


@app.get("/vessels")
@app.get("/api/v1/vessels")
def get_vessels():
    return engine.vessels


@app.get("/api/v1/vessels/{vessel_id}")
def get_vessel(vessel_id: str):
    vessel = next((item for item in engine.vessels if item.id == vessel_id), None)
    if vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel


@app.get("/api/v1/cameras")
def get_cameras(vessel_id: str | None = None):
    if vessel_id and next((item for item in engine.vessels if item.id == vessel_id), None) is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return [camera for camera in engine.cameras if vessel_id is None or camera.vessel_id == vessel_id]


@app.get("/events")
@app.get("/api/v1/events")
def get_events(vessel_id: str | None = None):
    if vessel_id and next((item for item in engine.vessels if item.id == vessel_id), None) is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return [event for event in engine.events if vessel_id is None or event.vessel_id == vessel_id]


@app.get("/incidents")
@app.get("/api/v1/incidents")
def get_incidents():
    return engine.incidents.get_all()


@app.get("/security/{vessel_id}")
def get_security(vessel_id: str):
    vessel = next((item for item in engine.vessels if item.id == vessel_id), None)
    if vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return {"vessel_id": vessel.id, "score": vessel.score, "status": vessel.status}


@app.get("/incidents/{incident_id}")
@app.get("/api/v1/incidents/{incident_id}")
def get_incident(incident_id: str):
    incident = engine.incidents.get(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.patch("/incidents/{incident_id}")
@app.patch("/api/v1/incidents/{incident_id}")
def update_incident(incident_id: str, update: IncidentUpdate):
    incident = engine.resolve_incident(incident_id, update.status, update.investigation_notes)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.get("/simulation/status")
@app.get("/api/v1/simulation/status")
def simulation_status():
    return {"scenario": engine.scenarios.name, "status": engine.scenarios.status, "index": engine.scenarios.index}


@app.post("/simulation/start")
@app.post("/api/v1/simulation/start")
def start_simulation(request: ScenarioRequest):
    try:
        engine.start(request.scenario)
        return {"status": engine.scenarios.status, "result": engine.tick()}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/simulation/tick")
@app.post("/api/v1/simulation/next")
def next_simulation_step():
    return engine.tick()


@app.post("/simulation/pause")
@app.post("/api/v1/simulation/pause")
def simulation_pause():
    engine.pause()
    return simulation_status()


@app.post("/simulation/resume")
@app.post("/api/v1/simulation/resume")
def simulation_resume():
    engine.resume()
    return simulation_status()


@app.post("/simulation/stop")
@app.post("/api/v1/simulation/stop")
def simulation_stop():
    engine.stop()
    return simulation_status()


@app.post("/simulation/reset")
@app.post("/api/v1/simulation/reset")
def simulation_reset():
    engine.reset()
    return simulation_status()


@app.post("/simulation/scenario/{scenario_name}/start")
@app.post("/api/v1/simulation/scenario/{scenario_name}/start")
def scenario_start(scenario_name: str):
    return start_simulation(ScenarioRequest(scenario=scenario_name))


@app.post("/api/v1/simulation/{action}")
def simulation_action(action: str):
    if action not in {"pause", "resume", "stop", "reset"}:
        raise HTTPException(status_code=404, detail="Unknown simulation action")
    getattr(engine, action)()
    if action == "reset":
        engine.reset()
    return {"scenario": engine.scenarios.name, "status": engine.scenarios.status, "index": engine.scenarios.index}
