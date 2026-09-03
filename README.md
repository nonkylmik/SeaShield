# SeaShield

SeaShield is a desktop-style maritime security operations prototype. It is intentionally simulation-only: no vessel, camera, network, or security infrastructure is connected.

## Run locally

From the workspace root:

```powershell
python -m http.server 4173 --directory SeaShield
```

Open `http://localhost:4173` in a browser. The page can also be opened directly from `SeaShield/index.html`.

## Prototype surface

- Persistent operations sidebar and operator top bar
- Fleet security posture, vessel status, availability, events, and shift summary
- Camera, cybersecurity, incident, sensor, access control, reports, fleet, vessel, and settings workspaces
- Local simulation controls for camera failure, unauthorized access, unknown devices, brute-force login, suspicious traffic, GPS anomaly, sensor failure, firewall blocks, and fire alarms
- Basic rule-driven correlation behavior represented in the local event stream
- Demo Scenario controls with start, pause, resume, stop, reset, incident lifecycle, score recovery, notifications, global timeline filters, and search

## Architecture

The browser entrypoint is `src/entry.js`. Shared state lives in `src/services/appStore.js`, mock-backed access is exposed by `src/services/services.js`, and simulation behavior is isolated under `src/simulation/`. Security scoring is kept in `src/utils/securityScore.js`.

Focused core tests live in `tests/simulation.test.mjs` and cover score bounds/recovery and correlation behavior.

`package.json` records the planned Vite/React/Tailwind migration path for the future desktop wrapper. Node/npm were not available in the current workstation, so V1 is delivered as a browser-launchable static prototype with the same service-boundary intent.