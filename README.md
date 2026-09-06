# SeaShield

SeaShield is a desktop-style maritime security operations prototype. It is intentionally simulation-only: no vessel, camera, network, or security infrastructure is connected.

## Database architecture

SeaShield V1.7 introduces a persistent data layer underneath the existing V1.8 WebSocket and REST architecture. FastAPI remains the API boundary, the simulation/security engine remains responsible for logic, and PostgreSQL becomes the durable source of truth for vessel state, events, incidents, and score history. SQLite is kept as a safe local fallback for development and for migration verification.

### Core tables

- `security_events`: persisted security event records, event metadata, scenario data, and timestamps
- `vessels`: vessel identity, base score, score, status, and communication timestamps
- `incidents`: incident definitions, severity, status, and investigation notes
- `incident_event_links`: many-to-many relation between incidents and their related event IDs
- `security_score_history`: score transitions over time for trend reconstruction
- `simulation_runs`: scenario lifecycle metadata for historical context

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your local PostgreSQL connection.
2. For local development without PostgreSQL, leave `DATABASE_URL` unset and the app will default to the SQLite file at `backend/seashield.db`.
3. Install project dependencies:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### PostgreSQL setup

```powershell
createdb -U postgres seashield
```

Then set the value in `.env` such as:

```env
DATABASE_URL=postgresql+asyncpg://postgres:change_me@localhost:5432/seashield
```

## Running

Start the backend:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Start the frontend:

```powershell
npm install
npm run dev
```

Open the UI at `http://localhost:5173`.

## Migrations

Apply the schema after configuration:

```powershell
cd backend
..\.venv\Scripts\python.exe -m alembic upgrade head
```

Create a new migration when the model changes:

```powershell
cd backend
..\.venv\Scripts\python.exe -m alembic revision -m "describe change"
```

If you need to roll back a migration in a local development database, use the Alembic downgrade command: 

```powershell
cd backend
..\.venv\Scripts\python.exe -m alembic downgrade -1
```

## Seed data

The project does not auto-populate demo records on startup. Use a local script or direct database session to insert a small set of development vessels if needed. Keep any seed scripts explicit and local-only.

## Testing

Run the backend tests:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
```

Run the frontend build:

```powershell
npm run build
```

## Architecture and compatibility

The existing V1.8 WebSocket flow remains intact. FastAPI emits live updates to the WebSocket manager, while the persistence layer stores the accepted events and incident/score records before or alongside those broadcasts. This preserves real-time behavior without removing the historical data path.

## Current status

This repository currently verified the backend persistence flow and frontend build in the local workspace. A real PostgreSQL server must be running for a true production-style connection test; the default SQLite configuration is used as a safe fallback for local validation.
