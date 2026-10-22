"""
analysis/db/models.py

SQLAlchemy ORM models for ARGUS persistence layer.

Tables
------
Job           — one row per APK analysis run
EvidenceItem  — individual evidence events (permissions, API calls, findings, OSINT, dynamic)
YaraRule      — generated YARA detection rule for a job
Artifact      — file-system paths for stored artifacts (APK, decompiled, screenshots, etc.)
AnalystNote   — analyst annotations (placeholder for Phase 9)

All primary keys are UUIDs stored as strings for portability between SQLite and PostgreSQL.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean,
    DateTime, ForeignKey, JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------

class Job(Base):
    """One row per APK analysis run."""

    __tablename__ = "jobs"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    filename        = Column(String(512), nullable=False)
    file_hash       = Column(String(64),  nullable=True, index=True)   # SHA-256
    status          = Column(String(32),  nullable=False, default="queued", index=True)
    # status values: queued | running | done | failed | timeout | deleted

    # Result fields — populated when status reaches "done"
    verdict         = Column(String(32),  nullable=True)
    confidence      = Column(Integer,     nullable=True)
    risk_score      = Column(Float,       nullable=True)
    analysis_scope  = Column(String(64),  nullable=True)
    iteration_count = Column(Integer,     nullable=True)
    executive_summary = Column(Text,      nullable=True)

    # Full result blob — stores the entire JSON result for quick retrieval
    result_json     = Column(JSON,        nullable=True)

    # Timestamps
    created_at      = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at      = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
    completed_at    = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    evidence_items  = relationship("EvidenceItem", back_populates="job",
                                   cascade="all, delete-orphan", lazy="dynamic")
    yara_rule       = relationship("YaraRule",     back_populates="job",
                                   uselist=False,  cascade="all, delete-orphan")
    artifacts       = relationship("Artifact",     back_populates="job",
                                   cascade="all, delete-orphan", lazy="dynamic")
    analyst_notes   = relationship("AnalystNote",  back_populates="job",
                                   cascade="all, delete-orphan", lazy="dynamic")

    def to_summary_dict(self) -> dict:
        """Lightweight dict for list views — no heavy result_json."""
        return {
            "id":               self.id,
            "filename":         self.filename,
            "file_hash":        self.file_hash,
            "status":           self.status,
            "verdict":          self.verdict,
            "confidence":       self.confidence,
            "risk_score":       self.risk_score,
            "analysis_scope":   self.analysis_scope,
            "iteration_count":  self.iteration_count,
            "executive_summary": self.executive_summary,
            "created_at":       self.created_at.isoformat() if self.created_at else None,
            "updated_at":       self.updated_at.isoformat() if self.updated_at else None,
            "completed_at":     self.completed_at.isoformat() if self.completed_at else None,
        }

    def to_detail_dict(self) -> dict:
        """Full dict for detail views — includes result_json."""
        d = self.to_summary_dict()
        d["result"] = self.result_json
        return d

    def __repr__(self) -> str:
        return f"<Job id={self.id!r} status={self.status!r} verdict={self.verdict!r}>"


# ---------------------------------------------------------------------------
# EvidenceItem
# ---------------------------------------------------------------------------

class EvidenceItem(Base):
    """One row per individual evidence event attached to a job.

    category values:
        permission      — declared permission from manifest
        api_call        — sensitive API call found in decompiled code
        finding         — manifest vulnerability or hardcoded secret
        dynamic_event   — Frida hook hit, logcat entry, monkey event
        osint           — VirusTotal / MalwareBazaar result
        correlation     — cross-tool correlation finding
        mitre           — mapped MITRE ATT&CK technique
    """

    __tablename__ = "evidence_items"

    id          = Column(String(36), primary_key=True, default=_uuid)
    job_id      = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    category    = Column(String(64), nullable=False, index=True)
    data        = Column(JSON,       nullable=False)   # Arbitrary structured payload
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    job = relationship("Job", back_populates="evidence_items")

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "job_id":     self.job_id,
            "category":   self.category,
            "data":       self.data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<EvidenceItem id={self.id!r} category={self.category!r}>"


# ---------------------------------------------------------------------------
# YaraRule
# ---------------------------------------------------------------------------

class YaraRule(Base):
    """Generated YARA detection rule for a job."""

    __tablename__ = "yara_rules"

    id          = Column(String(36), primary_key=True, default=_uuid)
    job_id      = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"),
                         nullable=False, unique=True, index=True)
    rule_name   = Column(String(256), nullable=False)
    rule_text   = Column(Text,        nullable=False)
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    job = relationship("Job", back_populates="yara_rule")

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "job_id":     self.job_id,
            "rule_name":  self.rule_name,
            "rule_text":  self.rule_text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<YaraRule id={self.id!r} rule_name={self.rule_name!r}>"


# ---------------------------------------------------------------------------
# Artifact
# ---------------------------------------------------------------------------

class Artifact(Base):
    """File-system path for a stored artifact belonging to a job.

    artifact_type values:
        apk           — original uploaded APK copy
        decompiled    — JADX decompiled output directory
        screenshot    — runtime screenshot PNG
        network_log   — captured network traffic (Phase 2)
        report        — generated HTML/PDF report (Phase 4)
        yara_file     — .yar file written to disk
    """

    __tablename__ = "artifacts"

    id            = Column(String(36),  primary_key=True, default=_uuid)
    job_id        = Column(String(36),  ForeignKey("jobs.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    artifact_type = Column(String(64),  nullable=False)
    file_path     = Column(String(1024), nullable=False)
    file_size     = Column(Integer,     nullable=True)   # bytes
    created_at    = Column(DateTime(timezone=True), default=_now, nullable=False)

    job = relationship("Job", back_populates="artifacts")

    def to_dict(self) -> dict:
        return {
            "id":            self.id,
            "job_id":        self.job_id,
            "artifact_type": self.artifact_type,
            "file_path":     self.file_path,
            "file_size":     self.file_size,
            "created_at":    self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Artifact id={self.id!r} type={self.artifact_type!r}>"


# ---------------------------------------------------------------------------
# AnalystNote  (placeholder for Phase 9)
# ---------------------------------------------------------------------------

class AnalystNote(Base):
    """Analyst annotation on a job or finding. Populated in Phase 9."""

    __tablename__ = "analyst_notes"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    job_id      = Column(String(36),  ForeignKey("jobs.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    note        = Column(Text,        nullable=False)
    author      = Column(String(256), nullable=True)
    label       = Column(String(64),  nullable=True)   # confirm | dismiss | escalate | relabel
    created_at  = Column(DateTime(timezone=True), default=_now, nullable=False)

    job = relationship("Job", back_populates="analyst_notes")

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "job_id":     self.job_id,
            "note":       self.note,
            "author":     self.author,
            "label":      self.label,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<AnalystNote id={self.id!r} label={self.label!r}>"
