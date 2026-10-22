"""
analysis/storage/artifact_store.py

File-system artifact storage for ARGUS.

Manages storing and retrieving binary artifacts (APKs, decompiled output,
screenshots, YARA files, reports) in a structured directory tree:

    {ARGUS_ARTIFACTS_DIR}/
        {job_id}/
            original.apk
            decompiled/          ← JADX output directory
            screenshots/
                screenshot_001.png
                ...
            detection.yar
            report.html          (Phase 4)

Environment Variables
---------------------
    ARGUS_ARTIFACTS_DIR   — root directory for artifacts (default: ./artifacts next to analysis/)
"""

import os
import shutil
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def _default_artifacts_root() -> Path:
    """Resolve the default artifacts root to analysis/../artifacts (project root)."""
    analysis_dir = Path(__file__).resolve().parent.parent
    return analysis_dir / "artifacts"


class ArtifactStore:
    """Manages file-system storage for per-job artifacts.

    Thread-safe for concurrent jobs because each job has its own directory.
    """

    def __init__(self):
        env_dir = os.environ.get("ARGUS_ARTIFACTS_DIR", "")
        if env_dir:
            self.root = Path(env_dir).resolve()
        else:
            self.root = _default_artifacts_root()
        self.root.mkdir(parents=True, exist_ok=True)
        logger.info("[ArtifactStore] Root: %s", self.root)
        print(f"[ArtifactStore] Artifact root: {self.root}", flush=True)

    # -----------------------------------------------------------------------
    # Directory helpers
    # -----------------------------------------------------------------------

    def _job_dir(self, job_id: str) -> Path:
        d = self.root / job_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _screenshots_dir(self, job_id: str) -> Path:
        d = self._job_dir(job_id) / "screenshots"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _decompiled_dir(self, job_id: str) -> Path:
        d = self._job_dir(job_id) / "decompiled"
        d.mkdir(parents=True, exist_ok=True)
        return d

    # -----------------------------------------------------------------------
    # Save helpers
    # -----------------------------------------------------------------------

    def save_apk(self, job_id: str, src_path: str) -> Optional[str]:
        """Copy the original APK into the job directory.

        Returns the destination path string, or None on error.
        """
        try:
            dest = self._job_dir(job_id) / "original.apk"
            shutil.copy2(src_path, dest)
            logger.info("[ArtifactStore] APK saved: %s", dest)
            return str(dest)
        except Exception as exc:
            logger.error("[ArtifactStore] Failed to save APK for job %s: %s", job_id, exc)
            return None

    def save_decompiled(self, job_id: str, src_dir: str) -> Optional[str]:
        """Copy an entire decompiled source directory into the job directory.

        If a 'decompiled' directory already exists for this job it is removed first.
        Returns the destination path string, or None on error.
        """
        try:
            dest = self._job_dir(job_id) / "decompiled"
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(src_dir, dest)
            logger.info("[ArtifactStore] Decompiled dir saved: %s", dest)
            return str(dest)
        except Exception as exc:
            logger.error("[ArtifactStore] Failed to save decompiled dir for job %s: %s", job_id, exc)
            return None

    def save_screenshot(self, job_id: str, src_path: str,
                        index: Optional[int] = None) -> Optional[str]:
        """Copy a screenshot PNG into the job's screenshots directory.

        Returns the destination path string, or None on error.
        """
        try:
            src = Path(src_path)
            suffix = src.suffix or ".png"
            if index is not None:
                filename = f"screenshot_{index:03d}{suffix}"
            else:
                # Use the source filename, deduplicated by timestamp if needed
                filename = src.name
            dest = self._screenshots_dir(job_id) / filename
            shutil.copy2(src_path, dest)
            logger.info("[ArtifactStore] Screenshot saved: %s", dest)
            return str(dest)
        except Exception as exc:
            logger.error("[ArtifactStore] Failed to save screenshot for job %s: %s", job_id, exc)
            return None

    def save_yara(self, job_id: str, rule_text: str) -> Optional[str]:
        """Write YARA rule text to detection.yar in the job directory.

        Returns the file path string, or None on error.
        """
        try:
            dest = self._job_dir(job_id) / "detection.yar"
            dest.write_text(rule_text, encoding="utf-8")
            logger.info("[ArtifactStore] YARA rule written: %s", dest)
            return str(dest)
        except Exception as exc:
            logger.error("[ArtifactStore] Failed to write YARA for job %s: %s", job_id, exc)
            return None

    def save_report(self, job_id: str, html_content: str) -> Optional[str]:
        """Write an HTML report to report.html in the job directory. (Phase 4)

        Returns the file path string, or None on error.
        """
        try:
            dest = self._job_dir(job_id) / "report.html"
            dest.write_text(html_content, encoding="utf-8")
            logger.info("[ArtifactStore] HTML report written: %s", dest)
            return str(dest)
        except Exception as exc:
            logger.error("[ArtifactStore] Failed to write report for job %s: %s", job_id, exc)
            return None

    def save_network_log(self, job_id: str, log_content: str,
                         filename: str = "network.pcapng") -> Optional[str]:
        """Write a network capture log to the job directory. (Phase 2)

        Returns the file path string, or None on error.
        """
        try:
            dest = self._job_dir(job_id) / filename
            dest.write_text(log_content, encoding="utf-8")
            logger.info("[ArtifactStore] Network log written: %s", dest)
            return str(dest)
        except Exception as exc:
            logger.error("[ArtifactStore] Failed to write network log for job %s: %s", job_id, exc)
            return None

    # -----------------------------------------------------------------------
    # Read helpers
    # -----------------------------------------------------------------------

    def get_artifact_path(self, job_id: str, artifact_type: str) -> Optional[str]:
        """Resolve the expected path for a known artifact_type.

        Returns the path string if the file/directory exists, else None.

        Supported types: apk, decompiled, yara_file, report, network_log
        """
        job_dir = self.root / job_id
        if not job_dir.exists():
            return None

        type_map = {
            "apk":         job_dir / "original.apk",
            "decompiled":  job_dir / "decompiled",
            "yara_file":   job_dir / "detection.yar",
            "report":      job_dir / "report.html",
            "network_log": job_dir / "network.pcapng",
        }
        path = type_map.get(artifact_type)
        if path and path.exists():
            return str(path)
        return None

    def get_screenshot_paths(self, job_id: str) -> list[str]:
        """Return all screenshot paths for a job, sorted."""
        ss_dir = self.root / job_id / "screenshots"
        if not ss_dir.exists():
            return []
        return sorted(str(p) for p in ss_dir.iterdir() if p.is_file())

    def job_dir_exists(self, job_id: str) -> bool:
        """Return True if the job artifact directory exists."""
        return (self.root / job_id).exists()

    def delete_job_artifacts(self, job_id: str) -> bool:
        """Remove all stored artifacts for a job. Returns True if directory existed."""
        job_dir = self.root / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
            logger.info("[ArtifactStore] Deleted artifact dir for job %s", job_id)
            return True
        return False

    def get_file_size(self, path: str) -> int:
        """Return file size in bytes, or 0 if file doesn't exist."""
        try:
            return os.path.getsize(path)
        except OSError:
            return 0
