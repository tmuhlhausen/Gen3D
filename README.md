# LatticeForge 3D

AI-native 3D generation and modelling platform MVP scaffold.

## What is included

- Next.js web app with a dark SaaS-style 3D generation studio
- Three.js / React Three Fiber viewport shell
- Prompt-to-3D generation UI
- Asset queue and export controls
- FastAPI backend stub for prompt enhancement and generation jobs
- Shared schema notes for future model orchestration

## Quick start

### Web app

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

### API server

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/health`.

## MVP roadmap

1. Replace mock generation with real queue-backed jobs.
2. Add model providers: public LLM router, image-to-3D worker, texture worker.
3. Store outputs in S3/R2-compatible object storage.
4. Add auth, billing credits, project persistence, and export pipeline.
5. Add edit-with-language actions for selected mesh objects.
