# Architecture

LatticeForge is designed around a thin user-facing studio and a worker-oriented backend.

```text
Browser Studio
  -> API Gateway / FastAPI
  -> Prompt Planner
  -> Model Router
  -> Generation Queue
  -> GPU Workers
  -> Mesh Processing
  -> Texture Processing
  -> Asset Storage
  -> Export Service
```

## Backend layers

- **Routers** expose versioned API endpoints.
- **Schemas** define public request/response contracts.
- **Services** hold orchestration logic.
- **Repositories** abstract storage. The current implementation is in-memory for local development.
- **Workers** are represented by mock adapters and can be replaced by Celery, RQ, Temporal, or managed GPU queues.

## Model routing

The LLM should orchestrate, not directly generate meshes. A job can route through:

1. prompt enhancer
2. asset planner
3. text/image-to-3D model
4. mesh cleanup
5. UV unwrap
6. texture synthesis
7. retopology/decimation
8. export packager

## Data model candidates

- users
- organizations
- projects
- generations
- assets
- asset_versions
- model_providers
- usage_events
- credit_ledger
- api_keys

## Production storage

For production, use Postgres for metadata, Redis for queue/cache, and S3/R2/MinIO for meshes, textures, thumbnails, and exports.
