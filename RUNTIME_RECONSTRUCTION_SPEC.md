# Procedural-First Runtime Format Spec (v0.1)

## Vision
Treat assets as **reconstruction programs**, not static meshes.

- Minimize disk bytes and load-time bandwidth.
- Maximize visual quality per byte.
- Keep runtime deterministic and platform-friendly.

---

## 1) Representation Tiers

### Tier A — Formula Object
Store only:
- `primitive_family` (enum)
- `seed` (u64)
- `params` (packed float/int vector)
- `material_id`
- `transform`
- `symmetry_flags` (optional)

Use for: crystals, rocks, pillars, branches, gears, panel arrays.

### Tier B — Formula + Residual Patch
Store:
- Tier A payload
- small residual correction payload:
  - compressed displacement field **or**
  - sparse vertex patch deltas

Use for: mostly procedural assets with artist-guided refinements.

### Tier C — Baked Cluster Mesh
Store:
- clusterized mesh + compressed topology/geometry

Use only when reconstruction cost/quality constraints rule out Tier A/B.

---

## 2) Unified Implicit Field Family

For shape generation:

\[
F(x)=\sum_{i=1}^{N} w_i\exp\left(-\|A_i(x-c_i)\|^{p_i}\right) +
\sum_{j=1}^{M} s_j\max(0, n_j\cdot x-d_j)^{q_j} - \tau
\]

Interpretation:
- term 1: smooth anisotropic blobs (organic forms)
- term 2: directional cuts/planes (hard stylized forms)
- isosurface at `F(x)=0` defines mesh boundary

This single family supports organic + hard-surface hybrids with compact parameters.

---

## 3) Adaptive Tessellation by Error Budget

Cell score:

\[
D(c)=\frac{\alpha\kappa(c)+\beta s(c)+\gamma b(c)+\eta m(c)}{1+\lambda z(c)}
\]

Subdivide when `D(c) > T`.

Where:
- `κ(c)` curvature
- `s(c)` silhouette importance
- `b(c)` boundary sharpness
- `m(c)` material/detail frequency
- `z(c)` distance / expected pixel footprint

Result: triangles are spent where visible and perceptually important.

---

## 4) Cluster-Local Predictive Geometry Compression

Per cluster `k`, store:
- anchor `a_k`
- local basis `R_k=[t_k,b_k,n_k]`
- quantized residuals per vertex

Transform:
\[
r_i = R_k^T(v_i-a_k)
\]

Adaptive quantization:
\[
\Delta_i = \frac{\Delta_0}{1+\mu\kappa_i+\nu s_i},\quad q_i=\text{round}(r_i/\Delta_i)
\]

Flat interiors compress aggressively; silhouette/high-curvature regions preserve fidelity.

---

## 5) Topology Grammar Stream

Prefer topology commands over raw index buffers when patterns repeat.

Core grammar ops:
- `BASE_PROFILE`
- `EXTRUDE`
- `SPLIT_BRANCH`
- `RADIAL_REPEAT`
- `CUT_PLANE`
- `STITCH`
- `CAP`
- `LOFT_SECTION`

Store corrective topology/vertex payloads only where grammar reconstruction is insufficient.

---

## 6) Hybrid Representation Decision Function

Choose per object/cluster:

\[
C^*=\arg\min_C\left(B(C)+\omega E(C)+\phi T(C)\right)
\]

`C` candidates:
- formula-only
- formula + residual
- baked cluster mesh
- voxel field
- sdf patch

This yields content-adaptive compression instead of one-size-fits-all storage.

---

## 7) Texture Pipeline (Standard, Not Custom)

Use native BC formats + DDS via offline pipeline (e.g. DirectXTex):
- `BC1`: opaque low-risk
- `BC5`: normals
- `BC7`: high-quality color

Do not build custom runtime texture formats unless there is a proven breakthrough need.

---

## 8) Runtime Scripting Strategy

- Tools/editor: Python allowed.
- Shipping runtime: tiny DSL/bytecode VM.

Example DSL:
- `crystal(count=7, anisotropy=1.8, cut=0.42)`
- `branch(levels=4, twist=0.2, taper=0.7)`
- `panel_grid(x=6, y=8, bevel=0.03)`

Compile DSL offline into compact opcodes for deterministic runtime reconstruction.

---

## 9) Runtime Package Layout (Draft)

```text
[Header]
  magic, version, feature_bits, checksum, toc_offset

[TOC]
  section_id, offset, size, crc32

[PrimitiveOpcodeStream]
  formula objects + params + transforms

[ResidualClusterBlocks]
  residual patches + decode metadata

[ClusterTopologyStream]
  grammar commands + optional correction indices

[MaterialTable]
  material records, shader permutations, bindings

[TextureTable]
  DDS references (BC compressed), mips, sampler hints

[StringTable]
  names/ids for debugging + tooling
```

Versioning rules:
- strict semantic format version
- forward-compatible optional section flags
- section-level checksums + package checksum

---

## 10) MVP Implementation Blueprint

1. Implement Tier A loader + evaluator + mesher path.
2. Add adaptive tessellation metric `D(c)` with threshold controls.
3. Add clusterizer and local-frame quantized geometry codec.
4. Add topology grammar encoder/decoder for procedural classes.
5. Add Tier B residual patch path.
6. Add decision-function-based cooker (`argmin B+ωE+φT`).
7. Keep texture flow on BC/DDS pipeline.
8. Add lightweight runtime VM; keep Python in tools only.

---

## 11) Non-Destructive Integration Policy

To minimize risk:
- Keep legacy mesh path as fallback initially.
- Add new package sections incrementally.
- Gate each subsystem behind feature flags.
- Compare quality/perf/bytes with A/B cooked outputs.
