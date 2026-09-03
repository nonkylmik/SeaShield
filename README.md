# SeaShield

SeaShield is a desktop-style maritime security operations prototype. It is intentionally simulation-only: no vessel, camera, network, or security infrastructure is connected.

## Run locally

### SeaShield V1.7 - PostgreSQL

V1.7 persists security events in PostgreSQL through SQLAlchemy. Copy `.env.example` to `.env` and set `DATABASE_URL`; `.env` is ignored by Git. For local development without PostgreSQL, omit `DATABASE_URL` and the backend uses `backend/seashield.db` (SQLite) with the same ORM and migrations.

Create the PostgreSQL database once:

```powershell
createdb -U postgres seashield
```

Install backend dependencies and apply migrations:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m alembic upgrade head
cd ..
```

Start FastAPI in Terminal 1:

```powershell
\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Install frontend dependencies and start Vite in Terminal 2:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend uses `VITE_API_URL` with a development fallback of `http://localhost:8000`; set `$env:VITE_API_URL` before `npm run dev` to point at another API. Set `$env:VITE_POLL_INTERVAL_MS` to change the refresh interval (default: 2000 ms).

Persistent event API:

- `GET /api/security-events?limit=50&offset=0&severity=CRITICAL`
- `GET /api/security-events/{event_id}`
- `POST /api/security-events`
- `DELETE /api/security-events/{event_id}`

Simulation events are written to `security_events` as they are generated. The frontend reads this history through the same polling client, so events remain available after frontend or backend restarts. `POST /api/v1/simulation/reset` resets the active scenario but does not delete historical events.

Run tests:

```powershell
npm test
cd backend
..\.venv\Scripts\python.exe -m pytest
```

## Prototype surface

- Persistent operations sidebar and operator top bar
- Fleet security posture, vessel status, availability, events, and shift summary
- Camera, cybersecurity, incident, sensor, access control, reports, fleet, vessel, and settings workspaces
- FastAPI-backed vessel, camera, event, incident, score, health, and simulation state
- Demo Scenario controls with start, pause, resume, stop, reset, incident lifecycle, notifications, polling, and global timeline filters

## Architecture

The browser entrypoint is `src/entry.js`. `src/services/api/client.js` is the centralized HTTP client, `src/services/appStore.js` owns hydrated/polled presentation state, and `src/simulation/simulationEngine.js` forwards controls to FastAPI. Python remains the source of truth for events, incidents, scores, and scenario state.

Focused core tests live in `tests/simulation.test.mjs` and cover score bounds/recovery and correlation behavior.

The frontend is a Vite JavaScript cockpit with TypeScript API contracts in `src/services/api/types.d.ts`. Sensors and access-control records remain empty because V1.5 exposes no corresponding backend endpoints; they are reserved for a later API contract. PostgreSQL is the intended V1.7 deployment database; SQLite is only a local fallback when PostgreSQL is unavailable.