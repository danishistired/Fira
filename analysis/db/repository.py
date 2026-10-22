"""
analysis/db/repository.py

Clean data-access layer for ARGUS.

All database reads and writes go through these functions.
No raw SQL or ORM calls should appear in app.py or orchestrator.py.

Functions
---------
    create_job              — insert a new Job row, return the id
    update_job_status       — update status only (e.g. running → failed)
    update_job_result       — write verdict, confidence, result_json, etc. on completion
    add_evidence_items      — bulk-insert EvidenceItem rows for a job
    save_yara_rule          — insert or replace a YaraRule for a job
    save_artifact           — record a file-system artifact path for a job
    get_job                 — fetch a single Job by id
    list_jobs               — paginated list of Jobs (newest first)
    get_evidence            — paginated EvidenceItems for a job
    get_yara                — YaraRule for a job (or None)
    get_artifacts           — all Artifacts for a job
    soft_delete_job         — mark status = "deleted" (does not remove rows)
    job_exists_for_hash     — check if we've already analyzed this file_hash
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from .models import Job, EvidenceItem, YaraRule, Artifact
from .session import get_session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Job CRUD
# ---------------------------------------------------------------------------

def create_job(filename: str, file_hash: Optional[str] = None) -> str:
    """Insert a new Job with status='queued' and return its UUID string."""
    with get_session() as session:
        job = Job(
            filename=filename,
            file_hash=file_hash,
            status="queued",
        )
        session.add(job)
        session.flush()   # populate job.id before commit
        job_id = job.id
    logger.info("[repo] Created job %s for file %r", job_id, filename)
    return job_id


def update_job_status(job_id: str, status: str) -> bool:
    """Update the status column of a Job. Returns True if the job was found."""
    with get_session() as session:
        job = session.get(Job, job_id)
        if job is None:
            logger.warning("[repo] update_job_status: job %s not found", job_id)
            return False
        job.status = status
        job.updated_at = datetime.now(timezone.utc)
        if status in ("done", "failed", "timeout"):
            job.completed_at = datetime.now(timezone.utc)
    logger.info("[repo] Job %s → status=%s", job_id, status)
    return True


def update_job_result(job_id: str, result: dict) -> bool:
    """Write the analysis result into the Job row.

    Extracts top-level scalar fields for easy querying while also
    storing the full result JSON blob for detail views.

    Returns True if the job was found and updated.
    """
    with get_session() as session:
        job = session.get(Job, job_id)
        if job is None:
            logger.warning("[repo] update_job_result: job %s not found", job_id)
            return False

        job.status          = "done"
        job.verdict         = result.get("verdict")
        job.confidence      = result.get("confidence")
        job.risk_score      = result.get("permission_score_percent")
        job.analysis_scope  = result.get("analysis_scope")
        job.iteration_count = result.get("investigation_iterations")
        job.executive_summary = result.get("executive_summary") or result.get("analyst_summary")
        job.result_json     = result
        job.updated_at      = datetime.now(timezone.utc)
        job.completed_at    = datetime.now(timezone.utc)

    logger.info("[repo] Job %s result saved — verdict=%s confidence=%s",
                job_id, result.get("verdict"), result.get("confidence"))
    return True


def soft_delete_job(job_id: str) -> bool:
    """Mark a job as deleted without removing its rows."""
    return update_job_status(job_id, "deleted")


def job_exists_for_hash(file_hash: str) -> Optional[str]:
    """Return the job_id of a previously completed analysis for this file_hash, or None."""
    if not file_hash:
        return None
    with get_session() as session:
        job = (
            session.query(Job)
            .filter(Job.file_hash == file_hash, Job.status == "done")
            .order_by(Job.created_at.desc())
            .first()
        )
        return job.id if job else None


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

def add_evidence_items(job_id: str, items: list[dict]) -> int:
    """Bulk-insert EvidenceItem rows for a job.

    Each item in `items` must have:
        category  (str)  — e.g. "permission", "api_call", "osint", "correlation"
        data      (dict) — arbitrary payload

    Returns the number of rows inserted.
    """
    if not items:
        return 0
    with get_session() as session:
        rows = [
            EvidenceItem(
                job_id=job_id,
                category=item.get("category", "unknown"),
                data=item.get("data", {}),
            )
            for item in items
        ]
        session.bulk_save_objects(rows)
    logger.info("[repo] Inserted %d evidence items for job %s", len(rows), job_id)
    return len(rows)


def _extract_evidence_items(result: dict) -> list[dict]:
    """Convert a raw orchestrator result dict into a list of EvidenceItem dicts.

    Called by app.py after update_job_result to populate the evidence table.
    We extract the most useful structured fields; the full blob is in result_json.
    """
    items = []

    # Permissions
    for perm in result.get("permissions", []):
        items.append({"category": "permission", "data": {"permission": perm}})

    # API calls
    for call in result.get("api_calls", []):
        items.append({"category": "api_call", "data": call})

    # Manifest vulnerabilities / findings
    for vuln in result.get("manifest_vulnerabilities", []):
        items.append({"category": "finding", "data": vuln})

    # Hardcoded secrets
    for secret in result.get("hardcoded_secrets", []):
        items.append({"category": "finding", "data": {**secret, "finding_type": "hardcoded_secret"}})

    # Correlations
    for corr in result.get("correlations", []):
        items.append({"category": "correlation", "data": corr})

    # MITRE techniques
    for technique in result.get("mitre_techniques", []):
        items.append({"category": "mitre", "data": {"technique": technique}})

    # OSINT
    osint = result.get("osint", {})
    if osint:
        items.append({"category": "osint", "data": osint})

    # Dynamic logs (summarized — full logs are in result_json)
    dynamic_logs = result.get("dynamic_logs") or []
    for log_entry in dynamic_logs[:50]:   # cap at 50 rows
        items.append({"category": "dynamic_event", "data": log_entry if isinstance(log_entry, dict) else {"raw": str(log_entry)}})

    return items


# ---------------------------------------------------------------------------
# YARA
# ---------------------------------------------------------------------------

def save_yara_rule(job_id: str, rule_name: str, rule_text: str) -> bool:
    """Insert or replace the YARA rule for a job."""
    with get_session() as session:
        existing = session.query(YaraRule).filter(YaraRule.job_id == job_id).first()
        if existing:
            existing.rule_name = rule_name
            existing.rule_text = rule_text
        else:
            session.add(YaraRule(job_id=job_id, rule_name=rule_name, rule_text=rule_text))
    logger.info("[repo] YARA rule saved for job %s: %s", job_id, rule_name)
    return True


def get_yara(job_id: str) -> Optional[dict]:
    """Return the YaraRule dict for a job, or None."""
    with get_session() as session:
        rule = session.query(YaraRule).filter(YaraRule.job_id == job_id).first()
        return rule.to_dict() if rule else None


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------

def save_artifact(job_id: str, artifact_type: str, file_path: str,
                  file_size: Optional[int] = None) -> str:
    """Record a file-system artifact for a job. Returns the new Artifact id."""
    with get_session() as session:
        artifact = Artifact(
            job_id=job_id,
            artifact_type=artifact_type,
            file_path=file_path,
            file_size=file_size,
        )
        session.add(artifact)
        session.flush()
        artifact_id = artifact.id
    logger.info("[repo] Artifact saved for job %s: %s → %s", job_id, artifact_type, file_path)
    return artifact_id


def get_artifacts(job_id: str) -> list[dict]:
    """Return all Artifact dicts for a job."""
    with get_session() as session:
        artifacts = session.query(Artifact).filter(Artifact.job_id == job_id).all()
        return [a.to_dict() for a in artifacts]


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_job(job_id: str) -> Optional[dict]:
    """Return a Job detail dict (includes result_json), or None if not found."""
    with get_session() as session:
        job = session.get(Job, job_id)
        return job.to_detail_dict() if job else None


def list_jobs(limit: int = 50, offset: int = 0,
              status_filter: Optional[str] = None) -> list[dict]:
    """Return a paginated list of Job summary dicts, newest first.

    Pass status_filter (e.g. "done") to narrow results.
    Excludes deleted jobs unless status_filter == "deleted".
    """
    with get_session() as session:
        q = session.query(Job)
        if status_filter:
            q = q.filter(Job.status == status_filter)
        else:
            q = q.filter(Job.status != "deleted")
        jobs = q.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()
        return [j.to_summary_dict() for j in jobs]


def get_evidence(job_id: str, limit: int = 200, offset: int = 0,
                 category: Optional[str] = None) -> list[dict]:
    """Return paginated EvidenceItem dicts for a job."""
    with get_session() as session:
        q = session.query(EvidenceItem).filter(EvidenceItem.job_id == job_id)
        if category:
            q = q.filter(EvidenceItem.category == category)
        items = q.order_by(EvidenceItem.created_at).offset(offset).limit(limit).all()
        return [i.to_dict() for i in items]


def count_jobs(status_filter: Optional[str] = None) -> int:
    """Return the total count of jobs (for pagination metadata)."""
    with get_session() as session:
        q = session.query(Job)
        if status_filter:
            q = q.filter(Job.status == status_filter)
        else:
            q = q.filter(Job.status != "deleted")
        return q.count()
