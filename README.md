# Gen3D

A starter full-stack scaffold for a browser-based 3D generation studio.

## What is included

- **frontend/** — Vite + React app with:
  - prompt-based 3D generation UI
  - backend connection settings
  - job submission and polling
  - demo fallback mode
  - simple Three.js viewport via React Three Fiber
- **backend/** — FastAPI scaffold with:
  - `/health` and `/v1/health`
  - `/generate-3d` and `/v1/generate-3d`
  - `/jobs` and `/v1/jobs`
  - `/jobs/{id}` and `/v1/jobs/{id}`
  - `/uploads/reference` placeholder endpoint
  - in-memory job store
  - simulated async generation pipeline

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional environment variables:

- `MESHFORGE_API_TOKEN=your-secret-token`
- `MESHFORGE_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000`
- `MESHFORGE_PUBLIC_ASSET_BASE=http://localhost:8000/assets`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000` but also lets you change the API base URL and bearer token from the UI.

## Notes

This repo currently contains a scaffold, not a production inference stack. To turn it into a real product, the next steps are:

1. replace the mock generation pipeline with a real model service
2. move jobs and uploads into a database + object storage
3. add auth, billing, rate limiting, and webhooks
4. add true image upload and mesh upload flows
5. add deployment configs for your preferred platform
