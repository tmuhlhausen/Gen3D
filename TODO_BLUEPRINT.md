# Revolutionary Geometry Runtime TODO Blueprint

## Phase 0 — Foundation
- [ ] Define binary format header + section TOC.
- [ ] Add feature flags for TierA/TierB/TierC paths.
- [ ] Implement deterministic seed handling and transform packing.

## Phase 1 — Procedural Core (Tier A)
- [ ] Implement primitive family registry.
- [ ] Implement unified implicit field evaluator `F(x)`.
- [ ] Implement isosurface extraction.
- [ ] Add debug views: field slices, normal visualization, curvature heatmap.

## Phase 2 — Smart Triangles
- [ ] Implement adaptive score `D(c)`.
- [ ] Add camera-aware silhouette term.
- [ ] Add quality presets (Ultra/Balanced/Low).

## Phase 3 — Compression Engine
- [ ] Clusterize generated meshes.
- [ ] Implement local-frame residual transform and quantization.
- [ ] Add per-cluster entropy coding.
- [ ] Add decompression benchmarks and error dashboards.

## Phase 4 — Topology Grammar
- [ ] Implement command stream IR.
- [ ] Encode extrusion/radial/branch/cap patterns.
- [ ] Decode grammar to index buffers at runtime.
- [ ] Store correction deltas for imperfect matches.

## Phase 5 — Tier B Residual Workflow
- [ ] Residual displacement field format.
- [ ] Sparse vertex patch format.
- [ ] Artist correction round-trip in tools.

## Phase 6 — Hybrid Decision Cooker
- [ ] Implement objective: `min(B + ωE + φT)`.
- [ ] Per-asset automatic tier selection.
- [ ] Report card output per asset (bytes/error/decode).

## Phase 7 — Runtime VM
- [ ] Define tiny DSL syntax + opcodes.
- [ ] Build offline compiler from DSL to bytecode.
- [ ] Runtime VM interpreter with deterministic execution.
- [ ] Keep Python only in tools pipeline.

## Phase 8 — Texture Strategy
- [ ] Standardize on DDS + BC1/BC5/BC7.
- [ ] Integrate offline conversion and mip generation.
- [ ] Add validation for format/sRGB/normal-map correctness.

## Phase 9 — Validation & Rollout
- [ ] A/B compare legacy mesh assets vs reconstruction assets.
- [ ] Establish perf gates (load time, frame time, memory, disk size).
- [ ] Gradual migration by asset family.
- [ ] Keep fallback path until parity or better.
