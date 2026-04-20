# Gen3D v2 runbook

This repository now contains a second framework slice that is additive to the original scaffold.

## What v2 adds

- `backend/app/` — a packaged FastAPI backend with:
  - SQLite-backed job persistence
  - filesystem-backed reference uploads
  - static asset serving from `/assets`
  - a local formula inference worker that publishes generated artifacts to disk
- `frontend/v2.html` — a separate Vite entrypoint with:
  - image/remesh upload staging
  - persisted API settings
  - queue syncing and active job polling
  - richer selected-job details and artifact download links
- Dockerfiles for backend and frontend
- `docker-compose.yml` for local full-stack startup

## Run locally without Docker

### Backend v2

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend v2

```bash
cd frontend
npm install
npm run dev
```

Open the standard scaffold at `/` or the richer v2 studio at `/v2.html`.

## Run with Docker Compose

```bash
docker compose up --build
```

Then open:

- frontend: `http://localhost:5173/v2.html`
- backend docs: `http://localhost:8000/docs`

## Current inference behavior

The backend now has a local deterministic worker rather than a pure placeholder runner:

- text jobs produce prompt-conditioned procedural GLB meshes
- image jobs convert uploaded references into formula-derived relief GLBs
- remesh jobs clean and normalize uploaded mesh assets with `trimesh`

This is still not a neural production model. It is the first real adapter boundary: API → persisted job → worker → artifact → static asset URL. A future GPU worker or hosted model can replace the adapter without changing the public API contract.
