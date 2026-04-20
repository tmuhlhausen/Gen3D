# Local formula inference adapter

This branch replaces the v2 mock runner with a first real local worker adapter.

## Adapter

`backend/app/inference/formula_worker.py` implements `FormulaInferenceAdapter`.

It is intentionally deterministic and local. It is not a neural text-to-3D model yet. It gives the backend a working inference boundary that can be swapped later for a GPU worker, hosted model endpoint, or queue-backed job processor.

## Supported paths

### Text → 3D

Prompt-only jobs generate procedural primitive assemblies:

- shoe / sneaker / boot
- helmet / mask / headgear
- car / bike / vehicle / drone / hover
- chair / stool / furniture
- dragon / toy / character / mascot
- fallback abstract primitive

### Image → 3D

Image jobs use the first uploaded image reference and run a formula-driven relief pipeline:

1. signal extraction from luminance, saturation, edges, distance transform, and Laplacian channels
2. spectral depth decomposition
3. Poisson-inspired height reconstruction
4. Perona-Malik style anisotropic diffusion
5. adaptive relief mesh generation
6. Taubin/Laplacian smoothing for higher quality jobs
7. GLB export with vertex colors

### Remesh

Mesh uploads are loaded with `trimesh`, normalized, cleaned, and re-exported to GLB. Image uploads sent through remesh fall back to image relief generation.

## Output

The worker writes artifacts into:

```text
backend/data/jobs/<job_id>/artifact.glb
backend/data/jobs/<job_id>/manifest.json
```

The storage layer publishes the artifact via:

```text
/assets/jobs/<job_id>/artifact.glb
```

`JobRecord.output_url` and `JobRecord.asset_url` point to that static asset URL after completion.

## Local usage

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then open the v2 frontend at:

```text
http://localhost:5173/v2.html
```

Upload an image in the Image tab, submit the job, then download the generated GLB when it reaches 100%.

## Next adapter milestone

The next adapter should keep the same `FormulaInferenceAdapter.run(...)` shape but delegate to one of:

- a GPU worker process
- a queue such as Celery/RQ/Arq
- a hosted model endpoint
- a multimodal model pipeline that can produce true meshes from text/image references
