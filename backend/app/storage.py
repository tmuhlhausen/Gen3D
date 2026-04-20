from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from urllib.parse import quote

from .schemas import GenerationRequest, JobRecord, UploadResponse

SUPPORTED_OUTPUT_FORMATS = {"glb", "obj", "fbx", "usdz"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Store:
    def __init__(self, database_path: Path, storage_root: Path, public_asset_base: str) -> None:
        self.database_path = database_path
        self.storage_root = storage_root
        self.public_asset_base = public_asset_base.rstrip("/")
        self._lock = threading.Lock()
        self._connection = sqlite3.connect(self.database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row

    def initialize(self) -> None:
        self.storage_root.mkdir(parents=True, exist_ok=True)
        (self.storage_root / "uploads").mkdir(parents=True, exist_ok=True)
        (self.storage_root / "jobs").mkdir(parents=True, exist_ok=True)

        with self._lock:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS uploads (
                    upload_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    content_type TEXT,
                    size_bytes INTEGER NOT NULL,
                    url TEXT NOT NULL,
                    storage_path TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    progress INTEGER NOT NULL,
                    prompt TEXT NOT NULL,
                    negative_prompt TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    quality INTEGER NOT NULL,
                    texture_strength INTEGER NOT NULL,
                    symmetry INTEGER NOT NULL,
                    output_format TEXT NOT NULL,
                    seed INTEGER,
                    reference_upload_ids TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    output_url TEXT NOT NULL,
                    asset_url TEXT NOT NULL,
                    error TEXT
                );
                """
            )
            self._connection.commit()

    def create_upload(self, filename: str, content_type: Optional[str], content: bytes) -> UploadResponse:
        upload_id = str(uuid.uuid4())
        safe_name = Path(filename).name or "reference.bin"
        upload_dir = self.storage_root / "uploads" / upload_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        storage_path = upload_dir / safe_name
        storage_path.write_bytes(content)

        created_at = utc_now()
        url = f"{self.public_asset_base}/uploads/{upload_id}/{quote(safe_name)}"
        record = UploadResponse(
            upload_id=upload_id,
            filename=safe_name,
            content_type=content_type,
            size_bytes=len(content),
            url=url,
            created_at=created_at,
        )

        with self._lock:
            self._connection.execute(
                """
                INSERT INTO uploads (upload_id, filename, content_type, size_bytes, url, storage_path, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.upload_id,
                    record.filename,
                    record.content_type,
                    record.size_bytes,
                    record.url,
                    str(storage_path),
                    record.created_at.isoformat(),
                ),
            )
            self._connection.commit()

        return record

    def get_upload(self, upload_id: str) -> Optional[UploadResponse]:
        row = self._connection.execute(
            "SELECT upload_id, filename, content_type, size_bytes, url, created_at FROM uploads WHERE upload_id = ?",
            (upload_id,),
        ).fetchone()
        if row is None:
            return None
        return UploadResponse(
            upload_id=row["upload_id"],
            filename=row["filename"],
            content_type=row["content_type"],
            size_bytes=row["size_bytes"],
            url=row["url"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def get_upload_path(self, upload_id: str) -> Optional[Path]:
        row = self._connection.execute("SELECT storage_path FROM uploads WHERE upload_id = ?", (upload_id,)).fetchone()
        if row is None:
            return None
        return Path(row["storage_path"])

    def create_job(self, payload: GenerationRequest) -> JobRecord:
        now = utc_now()
        job = JobRecord(
            id=str(uuid.uuid4()),
            status="queued",
            progress=0,
            prompt=payload.prompt,
            negative_prompt=payload.negative_prompt,
            mode=payload.mode,
            quality=payload.quality,
            texture_strength=payload.texture_strength,
            symmetry=payload.symmetry,
            output_format=payload.output_format,
            seed=payload.seed,
            reference_upload_ids=payload.reference_upload_ids,
            metadata=payload.metadata,
            created_at=now,
            updated_at=now,
        )
        self._write_job(job)
        return job

    def list_jobs(self) -> list[JobRecord]:
        rows = self._connection.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
        return [self._job_from_row(row) for row in rows]

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        row = self._connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            return None
        return self._job_from_row(row)

    def delete_job(self, job_id: str) -> Optional[JobRecord]:
        job = self.get_job(job_id)
        if job is None:
            return None

        job_dir = self.storage_root / "jobs" / job_id
        if job_dir.exists():
            for path in sorted(job_dir.rglob("*"), reverse=True):
                if path.is_file():
                    path.unlink(missing_ok=True)
                elif path.is_dir():
                    path.rmdir()
            job_dir.rmdir()

        with self._lock:
            self._connection.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
            self._connection.commit()
        return job

    def update_job_progress(self, job_id: str, *, status: str, progress: int, error: Optional[str] = None) -> JobRecord:
        job = self.require_job(job_id)
        job.status = status
        job.progress = progress
        job.error = error
        job.updated_at = utc_now()
        self._write_job(job)
        return job

    def complete_job(self, job_id: str) -> JobRecord:
        job = self.require_job(job_id)
        job_dir = self.storage_root / "jobs" / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        asset_path = job_dir / f"artifact.{job.output_format}"
        placeholder = {
            "job_id": job.id,
            "status": "completed",
            "prompt": job.prompt,
            "mode": job.mode,
            "output_format": job.output_format,
            "reference_upload_ids": job.reference_upload_ids,
            "metadata": job.metadata,
            "note": "This is a scaffold placeholder artifact. Replace the mock runner with a real mesh generation pipeline.",
        }
        asset_path.write_text(json.dumps(placeholder, indent=2), encoding="utf-8")
        return self.complete_job_with_artifact(job_id, asset_path, placeholder)

    def complete_job_with_artifact(self, job_id: str, artifact_path: Path, manifest: Dict[str, Any]) -> JobRecord:
        job = self.require_job(job_id)
        artifact_path = Path(artifact_path)
        job_dir = self.storage_root / "jobs" / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        if artifact_path.parent != job_dir:
            target = job_dir / artifact_path.name
            target.write_bytes(artifact_path.read_bytes())
            artifact_path = target

        actual_format = artifact_path.suffix.lstrip(".").lower() or "glb"
        if actual_format not in SUPPORTED_OUTPUT_FORMATS:
            actual_format = "glb"

        merged_manifest: Dict[str, Any] = {
            "job_id": job.id,
            "status": "completed",
            "prompt": job.prompt,
            "mode": job.mode,
            "requested_output_format": job.output_format,
            "actual_output_format": actual_format,
            "artifact": artifact_path.name,
            "reference_upload_ids": job.reference_upload_ids,
            "metadata": job.metadata,
            **manifest,
        }
        (job_dir / "manifest.json").write_text(json.dumps(merged_manifest, indent=2, sort_keys=True), encoding="utf-8")

        asset_url = f"{self.public_asset_base}/jobs/{job.id}/{quote(artifact_path.name)}"
        job.status = "completed"
        job.progress = 100
        job.output_format = actual_format  # type: ignore[assignment]
        job.output_url = asset_url
        job.asset_url = asset_url
        job.updated_at = utc_now()
        job.metadata = {**job.metadata, "inference": merged_manifest}
        self._write_job(job)
        return job

    def fail_job(self, job_id: str, error: str) -> JobRecord:
        return self.update_job_progress(job_id, status="failed", progress=100, error=error)

    def require_uploads(self, upload_ids: Iterable[str]) -> None:
        missing = [upload_id for upload_id in upload_ids if self.get_upload(upload_id) is None]
        if missing:
            raise KeyError(", ".join(missing))

    def require_job(self, job_id: str) -> JobRecord:
        job = self.get_job(job_id)
        if job is None:
            raise KeyError(job_id)
        return job

    def _write_job(self, job: JobRecord) -> None:
        with self._lock:
            self._connection.execute(
                """
                INSERT OR REPLACE INTO jobs (
                    id, status, progress, prompt, negative_prompt, mode, quality,
                    texture_strength, symmetry, output_format, seed, reference_upload_ids,
                    metadata, created_at, updated_at, output_url, asset_url, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.id,
                    job.status,
                    job.progress,
                    job.prompt,
                    job.negative_prompt,
                    job.mode,
                    job.quality,
                    job.texture_strength,
                    int(job.symmetry),
                    job.output_format,
                    job.seed,
                    json.dumps(job.reference_upload_ids),
                    json.dumps(job.metadata),
                    job.created_at.isoformat(),
                    job.updated_at.isoformat(),
                    job.output_url,
                    job.asset_url,
                    job.error,
                ),
            )
            self._connection.commit()

    def _job_from_row(self, row: sqlite3.Row) -> JobRecord:
        return JobRecord(
            id=row["id"],
            status=row["status"],
            progress=row["progress"],
            prompt=row["prompt"],
            negative_prompt=row["negative_prompt"],
            mode=row["mode"],
            quality=row["quality"],
            texture_strength=row["texture_strength"],
            symmetry=bool(row["symmetry"]),
            output_format=row["output_format"],
            seed=row["seed"],
            reference_upload_ids=json.loads(row["reference_upload_ids"] or "[]"),
            metadata=json.loads(row["metadata"] or "{}"),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            output_url=row["output_url"],
            asset_url=row["asset_url"],
            error=row["error"],
        )
