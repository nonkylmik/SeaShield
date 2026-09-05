from datetime import datetime, timezone

from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import Base, SessionLocal, engine as db_engine, get_db
from db.events import create_event, delete_event, from_record, get_event, list_events, load_events
from auth import SESSION_COOKIE, SESSION_TTL_SECONDS, authenticate, create_session, read_session
from models.events import SecurityEvent
from models.incidents import IncidentUpdate
from schemas.security_events import SecurityEventCreate, SecurityEventResponse
from schemas.auth import LoginRequest, LoginResponse, UserResponse
from simulation.simulation_engine import SimulationEngine
from websocket_manager import ConnectionManager

class ScenarioRequest(BaseModel):
    scenario: str


app = FastAPI(title="SeaShield Security API", version="1.7.0", description="Simulation-only maritime security backend.")
app.add_middleware(CORSMiddleware, allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+", allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.state.websocket_manager = ConnectionManager()
engine = SimulationEngine(seed=7)
engine.set_broadcaster(app.state.websocket_manager.broadcast)


def event_response(record):
    event = from_record(record)
    return SecurityEventResponse(id=record.id, created_at=record.created_at, **event.model_dump())


async def broadcast_status_message(message_type: str, data: dict) -> None:
    await app.state.websocket_manager.broadcast({
        "type": message_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data,
    })


@app.on_event("startup")
def initialize_database() -> None:
    Base.metadata.create_all(bind=db_engine)
    with SessionLocal() as db:
        engine.events = load_events(db)
        engine.recalculate()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "online", "mode": "simulation", "version": "1.7.0"}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response):
    user = authenticate(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    response.set_cookie(SESSION_COOKIE, create_session(user), max_age=SESSION_TTL_SECONDS, httponly=True, samesite="lax", secure=False)
    return {"message": "Login successful", "user": UserResponse(email=user.email, name=user.name, role=user.role)}


@app.post("/api/auth/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)


@app.get("/api/auth/me", response_model=UserResponse)
def current_user(session: str | None = Cookie(default=None, alias=SESSION_COOKIE)):
    user = read_session(session)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse(email=user.email, name=user.name, role=user.role)


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
def get_events(vessel_id: str | None = None, db: Session = Depends(get_db)):
    return [from_record(event) for event in list_events(db, limit=500, offset=0, vessel_id=vessel_id)]


def persist_tick(db: Session):
    result = engine.tick()
    if result is None:
        return None
    create_event(db, result.event, engine.scenarios.name)
    return result


@app.get("/api/security-events", response_model=list[SecurityEventResponse])
def get_security_events(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0), severity: str | None = None, event_type: str | None = None, status: str | None = None, scenario: str | None = None, vessel_id: str | None = None, start: datetime | None = None, end: datetime | None = None, db: Session = Depends(get_db)):
    return [event_response(event) for event in list_events(db, limit=limit, offset=offset, severity=severity, event_type=event_type, status=status, scenario=scenario, vessel_id=vessel_id, start=start, end=end)]


@app.get("/api/security-events/{event_id}", response_model=SecurityEventResponse)
def get_security_event(event_id: str, db: Session = Depends(get_db)):
    event = get_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Security event not found")
    return event_response(event)


@app.post("/api/security-events", response_model=SecurityEventResponse, status_code=201)
def post_security_event(payload: SecurityEventCreate, db: Session = Depends(get_db)):
    if get_event(db, payload.event_id):
        raise HTTPException(status_code=409, detail="Event ID already exists")
    return event_response(create_event(db, SecurityEvent(**payload.model_dump()), payload.scenario))


@app.delete("/api/security-events/{event_id}", status_code=204)
def remove_security_event(event_id: str, db: Session = Depends(get_db)):
    if not delete_event(db, event_id):
        raise HTTPException(status_code=404, detail="Security event not found")


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


@app.websocket("/ws/security")
async def websocket_security(websocket: WebSocket):
    manager = app.state.websocket_manager
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


@app.post("/simulation/start")
@app.post("/api/v1/simulation/start")
async def start_simulation(request: ScenarioRequest, db: Session = Depends(get_db)):
    try:
        engine.start(request.scenario)
        await broadcast_status_message("simulation_status", {"scenario": engine.scenarios.name, "status": engine.scenarios.status.value, "index": engine.scenarios.index})
        await broadcast_status_message("notification", {"title": "Simulation started", "message": f"{engine.scenarios.name} started.", "severity": "INFO"})
        return {"status": engine.scenarios.status, "result": persist_tick(db)}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/simulation/tick")
@app.post("/api/v1/simulation/next")
def next_simulation_step(db: Session = Depends(get_db)):
    return persist_tick(db)


@app.post("/simulation/pause")
@app.post("/api/v1/simulation/pause")
async def simulation_pause():
    engine.pause()
    await broadcast_status_message("simulation_status", {"scenario": engine.scenarios.name, "status": engine.scenarios.status.value, "index": engine.scenarios.index})
    await broadcast_status_message("notification", {"title": "Simulation paused", "message": "The active simulation has been paused.", "severity": "INFO"})
    return simulation_status()


@app.post("/simulation/resume")
@app.post("/api/v1/simulation/resume")
async def simulation_resume():
    engine.resume()
    await broadcast_status_message("simulation_status", {"scenario": engine.scenarios.name, "status": engine.scenarios.status.value, "index": engine.scenarios.index})
    await broadcast_status_message("notification", {"title": "Simulation resumed", "message": "The active simulation has resumed.", "severity": "INFO"})
    return simulation_status()


@app.post("/simulation/stop")
@app.post("/api/v1/simulation/stop")
async def simulation_stop():
    engine.stop()
    await broadcast_status_message("simulation_status", {"scenario": engine.scenarios.name, "status": engine.scenarios.status.value, "index": engine.scenarios.index})
    await broadcast_status_message("notification", {"title": "Simulation stopped", "message": "The active simulation has been stopped.", "severity": "WARNING"})
    return simulation_status()


@app.post("/simulation/reset")
@app.post("/api/v1/simulation/reset")
async def simulation_reset():
    engine.reset()
    with SessionLocal() as db:
        engine.events = load_events(db)
        engine.recalculate()
    await broadcast_status_message("simulation_status", {"scenario": engine.scenarios.name, "status": engine.scenarios.status.value, "index": engine.scenarios.index})
    await broadcast_status_message("notification", {"title": "Simulation reset", "message": "The simulation has been reset.", "severity": "INFO"})
    return simulation_status()


@app.post("/simulation/scenario/{scenario_name}/start")
@app.post("/api/v1/simulation/scenario/{scenario_name}/start")
async def scenario_start(scenario_name: str, db: Session = Depends(get_db)):
    return await start_simulation(ScenarioRequest(scenario=scenario_name), db)


@app.post("/api/v1/simulation/{action}")
async def simulation_action(action: str):
    if action not in {"pause", "resume", "stop", "reset"}:
        raise HTTPException(status_code=404, detail="Unknown simulation action")
    if action == "pause":
        await simulation_pause()
    elif action == "resume":
        await simulation_resume()
    elif action == "stop":
        await simulation_stop()
    elif action == "reset":
        await simulation_reset()
    return {"scenario": engine.scenarios.name, "status": engine.scenarios.status, "index": engine.scenarios.index}
