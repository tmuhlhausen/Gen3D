# LatticeForge 3D

LatticeForge 3D is an AI-native 3D modelling and rendering platform foundation. It combines a browser studio, a queue-ready FastAPI backend, prompt planning, public model routing stubs, asset lifecycle APIs, and a Three.js viewport shell.

## What changed in this upgrade

- Expanded backend into routers, services, schemas, settings, in-memory repositories, and orchestration layers.
- Added job lifecycle endpoints for text-to-3D, image-to-3D, prompt enhancement, asset listing, and model routing.
- Upgraded the frontend into a richer studio with mode cards, production stats, an asset inspector, queue panels, and a larger viewport.
- Added Docker Compose, Dockerfiles, CI, and architecture docs.
- Added shared TypeScript types and JSON schema for generation jobs.

## Repository layout

```text
apps/
  api/      FastAPI orchestration API
  web/      Next.js studio UI
packages/
  shared/   shared schemas and TypeScript types
docs/       architecture and roadmap notes
infra/      local development helpers
```

## Quick start

### Full stack with Docker

```bash
docker compose up --build
```

Web: http://localhost:3000
API: http://localhost:8000/docs

### API only

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Web only

```bash
npm install
npm run dev -w apps/web
```

## Core API endpoints

- `GET /health`
- `GET /v1/models`
- `POST /v1/prompts/enhance`
- `POST /v1/generations/text-to-3d`
- `POST /v1/generations/image-to-3d`
- `GET /v1/generations`
- `GET /v1/generations/{job_id}`
- `GET /v1/assets`
- `POST /v1/assistant/actions`

## Product pillars

1. Generate from text, images, or references.
2. Edit using traditional controls and language commands.
3. Texture with PBR workflows.
4. Optimize for games, AR, rendering, and commerce.
5. Export to GLB, FBX, OBJ, and USDZ.

## Next production steps

1. Replace the mock worker with Celery, RQ, or Temporal.
2. Add persistent Postgres models for users, projects, jobs, assets, and billing.
3. Connect object storage such as S3, Cloudflare R2, or MinIO.
4. Add real model adapters for public LLMs, diffusion, reconstruction, retopology, and texture synthesis.
5. Add authentication, usage credits, and team workspaces.
