# SeaShield

SeaShield is a desktop-style maritime security operations prototype. It is intentionally simulation-only: no vessel, camera, network, or security infrastructure is connected.

## Run locally

Install the frontend dependencies from the workspace root:

```powershell
npm install
```

Terminal 1, start FastAPI from the workspace root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Terminal 2, start the Vite cockpit:

```powershell
npm run dev
```

Open `http://localhost:5173`. The frontend uses `VITE_API_URL` with a development fallback of `http://localhost:8000`; set `$env:VITE_API_URL` before `npm run dev` to point at another API. Set `$env:VITE_POLL_INTERVAL_MS` to change the refresh interval (default: 2000 ms).

## Prototype surface

- Persistent operations sidebar and operator top bar
- Fleet security posture, vessel status, availability, events, and shift summary
- Camera, cybersecurity, incident, sensor, access control, reports, fleet, vessel, and settings workspaces
- FastAPI-backed vessel, camera, event, incident, score, health, and simulation state
- Demo Scenario controls with start, pause, resume, stop, reset, incident lifecycle, notifications, polling, and global timeline filters

## Architecture

The browser entrypoint is `src/entry.js`. `src/services/api/client.js` is the centralized HTTP client, `src/services/appStore.js` owns hydrated/polled presentation state, and `src/simulation/simulationEngine.js` forwards controls to FastAPI. Python remains the source of truth for events, incidents, scores, and scenario state.

Focused core tests live in `tests/simulation.test.mjs` and cover score bounds/recovery and correlation behavior.

The frontend is a Vite JavaScript cockpit with TypeScript API contracts in `src/services/api/types.d.ts`. Sensors and access-control records remain empty because V1.5 exposes no corresponding backend endpoints; they are reserved for a later API contract.