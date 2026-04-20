from __future__ import annotations

import json
import math
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional

import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage
from scipy.fft import fft2, fftfreq, ifft2
from scipy.ndimage import gaussian_filter, uniform_filter
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve

from ..schemas import JobRecord

ProgressCallback = Callable[[int, str], None]


class InferenceError(RuntimeError):
    """Raised when a local inference adapter cannot produce an artifact."""


@dataclass(frozen=True)
class InferenceArtifact:
    artifact_path: Path
    manifest: Dict[str, object]


@dataclass(frozen=True)
class FormulaQuality:
    resolution: int
    diffusion_iterations: int
    smoothing_iterations: int
    depth_scale: float


QUALITY_PRESETS: Dict[str, FormulaQuality] = {
    "draft": FormulaQuality(resolution=72, diffusion_iterations=4, smoothing_iterations=0, depth_scale=0.26),
    "standard": FormulaQuality(resolution=112, diffusion_iterations=8, smoothing_iterations=1, depth_scale=0.32),
    "high": FormulaQuality(resolution=152, diffusion_iterations=12, smoothing_iterations=2, depth_scale=0.38),
    "ultra": FormulaQuality(resolution=192, diffusion_iterations=16, smoothing_iterations=3, depth_scale=0.44),
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
MESH_EXTENSIONS = {".glb", ".gltf", ".obj", ".stl", ".ply"}


class FormulaInferenceAdapter:
    """
    Local, deterministic inference adapter for the first real Gen3D worker.

    It turns prompt-only jobs into procedural primitive assemblies and image jobs
    into textured relief meshes using a compact formula stack inspired by the
    GeoCompute/Formulas reference: signal extraction, spectral depth, Poisson
    reconstruction, Perona-Malik diffusion, Laplacian smoothing, and GLB export.
    """

    def run(
        self,
        job: JobRecord,
        upload_paths: Iterable[Path],
        output_dir: Path,
        progress: Optional[ProgressCallback] = None,
    ) -> InferenceArtifact:
        started = time.perf_counter()
        output_dir.mkdir(parents=True, exist_ok=True)
        paths = [Path(path) for path in upload_paths]
        quality = self._quality_for_job(job)

        def tick(value: int, message: str) -> None:
            if progress is not None:
                progress(max(1, min(value, 99)), message)

        tick(6, "initializing local formula worker")

        if job.mode == "mesh_to_mesh" and paths:
            artifact = self._remesh(paths[0], output_dir, tick)
            mode = "mesh_to_mesh"
        elif job.mode == "image_to_3d" and paths:
            image_path = self._first_supported(paths, IMAGE_EXTENSIONS)
            if image_path is None:
                raise InferenceError("image_to_3d requires an uploaded image file")
            artifact = self._image_to_relief(image_path, output_dir, quality, tick)
            mode = "image_to_3d"
        else:
            artifact = self._prompt_to_mesh(job.prompt, output_dir, tick)
            mode = "text_to_3d"

        elapsed = round(time.perf_counter() - started, 3)
        manifest = {
            "job_id": job.id,
            "adapter": "formula-local-v1",
            "mode": mode,
            "prompt": job.prompt,
            "quality": self._quality_name(job),
            "artifact": artifact.name,
            "elapsed_seconds": elapsed,
            "input_uploads": [str(path.name) for path in paths],
            "notes": [
                "Local deterministic worker, not a neural model.",
                "Image jobs use formula-derived depth and relief meshing.",
                "Text jobs use prompt-conditioned procedural primitive assemblies.",
            ],
        }
        return InferenceArtifact(artifact_path=artifact, manifest=manifest)

    def _quality_name(self, job: JobRecord) -> str:
        if job.quality >= 92:
            return "ultra"
        if job.quality >= 74:
            return "high"
        if job.quality >= 42:
            return "standard"
        return "draft"

    def _quality_for_job(self, job: JobRecord) -> FormulaQuality:
        return QUALITY_PRESETS[self._quality_name(job)]

    def _first_supported(self, paths: List[Path], extensions: set[str]) -> Optional[Path]:
        for path in paths:
            if path.suffix.lower() in extensions and path.exists():
                return path
        return None

    def _remesh(self, upload_path: Path, output_dir: Path, progress: ProgressCallback) -> Path:
        progress(16, "loading source mesh")
        if upload_path.suffix.lower() not in MESH_EXTENSIONS:
            if upload_path.suffix.lower() in IMAGE_EXTENSIONS:
                return self._image_to_relief(upload_path, output_dir, QUALITY_PRESETS["standard"], progress)
            raise InferenceError(f"unsupported remesh input: {upload_path.name}")

        try:
            loaded = trimesh.load(upload_path, force="scene")
        except Exception as exc:  # pragma: no cover - file-format dependent
            raise InferenceError(f"could not load source mesh: {exc}") from exc

        progress(48, "normalizing mesh scene")
        if isinstance(loaded, trimesh.Scene):
            mesh = loaded.dump(concatenate=True)
        else:
            mesh = loaded

        if mesh.is_empty or len(mesh.vertices) < 3 or len(mesh.faces) < 1:
            raise InferenceError("source mesh did not contain usable triangles")

        mesh.remove_duplicate_faces()
        mesh.remove_degenerate_faces()
        mesh.remove_unreferenced_vertices()
        mesh.fix_normals()
        self._normalize_mesh(mesh)

        progress(78, "exporting remeshed artifact")
        artifact = output_dir / "artifact.glb"
        mesh.export(artifact)
        return artifact

    def _image_to_relief(
        self,
        image_path: Path,
        output_dir: Path,
        quality: FormulaQuality,
        progress: ProgressCallback,
    ) -> Path:
        progress(12, "extracting image signal tensor")
        image = Image.open(image_path).convert("RGBA")
        image.thumbnail((quality.resolution, quality.resolution), Image.LANCZOS)
        if image.width < 4 or image.height < 4:
            raise InferenceError("reference image is too small for meshing")

        rgba = np.asarray(image, dtype=np.uint8)
        signal, mask = self._extract_signal(rgba)
        if mask.sum() < 16:
            raise InferenceError("could not detect enough foreground pixels")

        progress(26, "composing formula depth field")
        depth = self._compose_depth(signal, mask)
        depth = self._anisotropic_diffusion(depth, mask, iterations=quality.diffusion_iterations)

        progress(48, "building adaptive relief mesh")
        mesh = self._mesh_from_depth(depth, rgba, mask, depth_scale=quality.depth_scale)

        if quality.smoothing_iterations > 0:
            progress(68, "smoothing mesh surface")
            mesh = self._laplacian_smooth(mesh, iterations=quality.smoothing_iterations)

        mesh.remove_degenerate_faces()
        mesh.remove_unreferenced_vertices()
        mesh.fix_normals()
        self._normalize_mesh(mesh)

        progress(88, "exporting GLB artifact")
        artifact = output_dir / "artifact.glb"
        mesh.export(artifact)
        return artifact

    def _prompt_to_mesh(self, prompt: str, output_dir: Path, progress: ProgressCallback) -> Path:
        prompt_l = (prompt or "").lower()
        progress(20, "constructing prompt primitive assembly")

        if any(word in prompt_l for word in ("shoe", "sneaker", "boot")):
            parts = self._shoe_parts()
        elif any(word in prompt_l for word in ("helmet", "mask", "headgear")):
            parts = self._helmet_parts()
        elif any(word in prompt_l for word in ("car", "bike", "vehicle", "drone", "hover")):
            parts = self._vehicle_parts()
        elif any(word in prompt_l for word in ("chair", "stool", "furniture")):
            parts = self._stool_parts()
        elif any(word in prompt_l for word in ("dragon", "toy", "character", "mascot", "creature")):
            parts = self._character_parts()
        else:
            parts = [trimesh.creation.icosphere(subdivisions=3, radius=0.72)]
            parts.append(trimesh.creation.torus(major_radius=0.52, minor_radius=0.12))

        progress(60, "merging procedural mesh parts")
        mesh = trimesh.util.concatenate(parts)
        mesh.visual.vertex_colors = self._palette_for_prompt(prompt, len(mesh.vertices))
        mesh.remove_duplicate_faces()
        mesh.remove_degenerate_faces()
        mesh.remove_unreferenced_vertices()
        mesh.fix_normals()
        self._normalize_mesh(mesh)

        progress(88, "exporting prompt GLB artifact")
        artifact = output_dir / "artifact.glb"
        mesh.export(artifact)
        return artifact

    def _extract_signal(self, rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        rgb = rgba[:, :, :3].astype(np.float64) / 255.0
        alpha = rgba[:, :, 3].astype(np.float64) / 255.0
        gray = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
        local_mean = uniform_filter(gray, size=max(3, min(gray.shape) // 6))
        mask = np.maximum(alpha > 0.08, gray > np.maximum(0.07, local_mean * 0.5)).astype(np.float64)
        mask = ndimage.binary_fill_holes(mask).astype(np.float64)
        mask = ndimage.binary_opening(mask, iterations=1).astype(np.float64)
        mask = ndimage.binary_dilation(mask, iterations=1).astype(np.float64)

        cmax = np.max(rgb, axis=2)
        cmin = np.min(rgb, axis=2)
        saturation = np.where(cmax > 0, (cmax - cmin) / (cmax + 1e-8), 0.0)
        sx = ndimage.sobel(gray, axis=1)
        sy = ndimage.sobel(gray, axis=0)
        edge = np.sqrt(sx**2 + sy**2)
        distance = ndimage.distance_transform_edt(mask)
        laplacian = np.abs(ndimage.laplace(gray))

        signal = np.stack(
            [
                self._norm(gray * mask),
                self._norm(saturation * mask),
                self._norm(edge * mask),
                self._norm(distance * mask),
                self._norm(laplacian * mask),
            ],
            axis=2,
        )
        return signal, mask

    def _compose_depth(self, signal: np.ndarray, mask: np.ndarray) -> np.ndarray:
        lum = gaussian_filter(signal[:, :, 0] + 0.32 * signal[:, :, 1] ** 2, sigma=1.1) * mask
        edge_distance = (1.0 - np.exp(-3.0 * signal[:, :, 3])) * mask
        gradient = gaussian_filter((1.0 - 0.55 * signal[:, :, 2]) * mask, sigma=0.8)
        spectral = self._spectral_depth(signal[:, :, 0], mask)
        poisson = self._poisson_depth(signal[:, :, 0], mask)
        depth = 0.26 * lum + 0.20 * edge_distance + 0.12 * gradient + 0.24 * spectral + 0.18 * poisson
        depth = depth * mask
        return self._norm(depth)

    def _spectral_depth(self, gray: np.ndarray, mask: np.ndarray) -> np.ndarray:
        h, w = gray.shape
        spectrum = fft2(gray * mask)
        fy = fftfreq(h).reshape(-1, 1)
        fx = fftfreq(w).reshape(1, -1)
        omega = np.sqrt(fx**2 + fy**2)
        low = np.exp(-(omega**2) / (2 * 0.08**2))
        band = np.exp(-((omega - 0.23) / 0.18) ** 2)
        base = self._norm(np.real(ifft2(spectrum * low)))
        detail = self._norm(np.real(ifft2(spectrum * band)))
        return self._norm((0.68 * base + 0.32 * detail) * mask)

    def _poisson_depth(self, gray: np.ndarray, mask: np.ndarray) -> np.ndarray:
        h, w = gray.shape
        scale = max(1, max(h, w) // 80)
        gray_s = gray[::scale, ::scale]
        mask_s = mask[::scale, ::scale]
        sh, sw = gray_s.shape
        if sh * sw > 10000:
            return gaussian_filter(gray * mask, sigma=2.0)

        gx = np.gradient(gray_s, axis=1) * 1.4
        gy = np.gradient(gray_s, axis=0) * 1.4
        rhs = (np.gradient(-gx, axis=1) + np.gradient(-gy, axis=0)) * mask_s
        n = sh * sw
        matrix = lil_matrix((n, n), dtype=np.float64)
        b = np.zeros(n, dtype=np.float64)

        for y in range(sh):
            for x in range(sw):
                idx = y * sw + x
                if mask_s[y, x] < 0.5:
                    matrix[idx, idx] = 1.0
                    continue
                matrix[idx, idx] = -4.0 + 1e-3
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < sh and 0 <= nx < sw:
                        matrix[idx, ny * sw + nx] = 1.0
                    else:
                        matrix[idx, idx] += 1.0
                b[idx] = rhs[y, x]

        try:
            solved = spsolve(matrix.tocsr(), b).reshape(sh, sw)
        except Exception:
            return gaussian_filter(gray * mask, sigma=2.0)

        depth = ndimage.zoom(solved, (h / sh, w / sw), order=1)[:h, :w] * mask
        return self._norm(depth)

    def _anisotropic_diffusion(self, depth: np.ndarray, mask: np.ndarray, iterations: int) -> np.ndarray:
        kappa = 0.12
        dt = 0.14
        field = depth.astype(np.float64).copy()
        for _ in range(iterations):
            north = np.roll(field, -1, axis=0) - field
            south = np.roll(field, 1, axis=0) - field
            east = np.roll(field, -1, axis=1) - field
            west = np.roll(field, 1, axis=1) - field
            field += dt * (
                np.exp(-(north / kappa) ** 2) * north
                + np.exp(-(south / kappa) ** 2) * south
                + np.exp(-(east / kappa) ** 2) * east
                + np.exp(-(west / kappa) ** 2) * west
            )
            field *= mask
        return self._norm(field * mask)

    def _mesh_from_depth(self, depth: np.ndarray, rgba: np.ndarray, mask: np.ndarray, depth_scale: float) -> trimesh.Trimesh:
        h, w = depth.shape
        aspect = w / max(h, 1)
        top_vertices: List[List[float]] = []
        colors: List[List[int]] = []
        vertex_map = np.full((h, w), -1, dtype=np.int32)

        for y in range(h):
            for x in range(w):
                if mask[y, x] <= 0.5:
                    continue
                px = (x / max(w - 1, 1) - 0.5) * 2.0 * aspect
                pz = (0.5 - y / max(h - 1, 1)) * 2.0
                py = float(depth[y, x]) * depth_scale
                vertex_map[y, x] = len(top_vertices)
                top_vertices.append([px, py, pz])
                colors.append(rgba[y, x].tolist())

        if len(top_vertices) < 3:
            raise InferenceError("not enough foreground geometry to build mesh")

        n_top = len(top_vertices)
        vertices = np.asarray(top_vertices + [[x, 0.0, z] for x, _, z in top_vertices], dtype=np.float64)
        vertex_colors = np.asarray(colors + colors, dtype=np.uint8)
        faces: List[List[int]] = []

        for y in range(h - 1):
            for x in range(w - 1):
                v00 = vertex_map[y, x]
                v10 = vertex_map[y, x + 1]
                v01 = vertex_map[y + 1, x]
                v11 = vertex_map[y + 1, x + 1]
                if min(v00, v10, v01) >= 0:
                    faces.append([int(v00), int(v01), int(v10)])
                    faces.append([int(v00 + n_top), int(v10 + n_top), int(v01 + n_top)])
                if min(v10, v01, v11) >= 0:
                    faces.append([int(v10), int(v01), int(v11)])
                    faces.append([int(v10 + n_top), int(v11 + n_top), int(v01 + n_top)])

        edge_counts: Dict[tuple[int, int], int] = {}
        for face in faces[::2]:
            for a, b in ((face[0], face[1]), (face[1], face[2]), (face[2], face[0])):
                edge = tuple(sorted((a, b)))
                edge_counts[edge] = edge_counts.get(edge, 0) + 1

        for (a, b), count in edge_counts.items():
            if count == 1:
                faces.append([a, b, b + n_top])
                faces.append([a, b + n_top, a + n_top])

        if len(faces) < 4:
            raise InferenceError("foreground mask produced no valid faces")

        mesh = trimesh.Trimesh(vertices=vertices, faces=np.asarray(faces, dtype=np.int64), process=False)
        mesh.visual.vertex_colors = vertex_colors
        return mesh

    def _laplacian_smooth(self, mesh: trimesh.Trimesh, iterations: int) -> trimesh.Trimesh:
        smoothed = mesh.copy()
        trimesh.smoothing.filter_taubin(smoothed, lamb=0.45, nu=-0.51, iterations=iterations)
        return smoothed

    def _shoe_parts(self) -> List[trimesh.Trimesh]:
        sole = trimesh.creation.box(extents=(1.8, 0.24, 0.72))
        upper = trimesh.creation.box(extents=(1.1, 0.48, 0.66))
        upper.apply_translation((0.18, 0.32, 0.0))
        toe = trimesh.creation.uv_sphere(segments=32, count=[16, 16], radius=0.36)
        toe.apply_scale((1.1, 0.45, 0.8))
        toe.apply_translation((0.68, 0.18, 0.0))
        return [sole, upper, toe]

    def _vehicle_parts(self) -> List[trimesh.Trimesh]:
        body = trimesh.creation.box(extents=(1.6, 0.36, 0.72))
        cabin = trimesh.creation.box(extents=(0.62, 0.34, 0.54))
        cabin.apply_translation((-0.15, 0.34, 0.0))
        parts = [body, cabin]
        for x in (-0.58, 0.58):
            wheel = trimesh.creation.cylinder(radius=0.18, height=0.82, sections=32)
            wheel.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, (1, 0, 0)))
            wheel.apply_translation((x, -0.22, 0.0))
            parts.append(wheel)
        return parts

    def _helmet_parts(self) -> List[trimesh.Trimesh]:
        shell = trimesh.creation.uv_sphere(segments=48, count=[24, 24], radius=0.72)
        shell.apply_scale((1.0, 0.78, 1.0))
        visor = trimesh.creation.box(extents=(0.86, 0.18, 0.12))
        visor.apply_translation((0.0, 0.05, 0.62))
        return [shell, visor]

    def _stool_parts(self) -> List[trimesh.Trimesh]:
        seat = trimesh.creation.cylinder(radius=0.62, height=0.22, sections=48)
        seat.apply_translation((0.0, 0.58, 0.0))
        parts = [seat]
        for x, z in ((-0.34, -0.34), (0.34, -0.34), (-0.34, 0.34), (0.34, 0.34)):
            leg = trimesh.creation.cylinder(radius=0.065, height=0.95, sections=16)
            leg.apply_translation((x, 0.05, z))
            parts.append(leg)
        return parts

    def _character_parts(self) -> List[trimesh.Trimesh]:
        body = trimesh.creation.uv_sphere(segments=32, count=[16, 16], radius=0.46)
        body.apply_scale((0.85, 1.25, 0.85))
        head = trimesh.creation.uv_sphere(segments=32, count=[16, 16], radius=0.34)
        head.apply_translation((0.0, 0.86, 0.0))
        parts = [body, head]
        for x in (-0.16, 0.16):
            eye = trimesh.creation.uv_sphere(segments=16, count=[8, 8], radius=0.055)
            eye.apply_translation((x, 0.93, 0.31))
            parts.append(eye)
        return parts

    def _palette_for_prompt(self, prompt: str, count: int) -> np.ndarray:
        prompt_l = (prompt or "").lower()
        if any(word in prompt_l for word in ("neon", "cyber", "sci-fi", "drone")):
            base = np.array([56, 189, 248, 255], dtype=np.uint8)
        elif any(word in prompt_l for word in ("wood", "ceramic", "stool")):
            base = np.array([207, 180, 140, 255], dtype=np.uint8)
        elif any(word in prompt_l for word in ("dragon", "toy", "mascot")):
            base = np.array([168, 85, 247, 255], dtype=np.uint8)
        else:
            base = np.array([226, 232, 240, 255], dtype=np.uint8)
        colors = np.tile(base, (count, 1))
        if count > 0:
            ramp = np.linspace(0.82, 1.14, count).reshape(-1, 1)
            colors[:, :3] = np.clip(colors[:, :3].astype(np.float64) * ramp, 0, 255).astype(np.uint8)
        return colors

    def _normalize_mesh(self, mesh: trimesh.Trimesh) -> None:
        bounds = mesh.bounds
        center = bounds.mean(axis=0)
        scale = float(np.max(bounds[1] - bounds[0])) or 1.0
        mesh.apply_translation(-center)
        mesh.apply_scale(2.0 / scale)

    def _norm(self, array: np.ndarray) -> np.ndarray:
        arr = np.asarray(array, dtype=np.float64)
        arr = arr - np.nanmin(arr)
        vmax = np.nanmax(arr)
        if not np.isfinite(vmax) or vmax <= 1e-12:
            return np.zeros_like(arr)
        return np.clip(arr / vmax, 0.0, 1.0)


def write_manifest(path: Path, manifest: Dict[str, object]) -> None:
    path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
