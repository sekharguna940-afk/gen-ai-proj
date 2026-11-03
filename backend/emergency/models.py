import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class EmergencySequence(Base):
    __tablename__ = "emergency_sequences"
    year = Column(Integer, primary_key=True)
    last_sequence = Column(Integer, default=0, nullable=False)


class EmergencyCategory(Base):
    __tablename__ = "emergency_categories"
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    default_severity = Column(String(20), default="HIGH", nullable=False)
    requires_photo = Column(Boolean, default=False, nullable=False)
    department = Column(String(100), default="Emergency Operations", nullable=False)
    sla_minutes = Column(Integer, default=30, nullable=False)
    icon = Column(String(50), default="AlertCircle", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "default_severity": self.default_severity,
            "requires_photo": self.requires_photo,
            "department": self.department,
            "sla_minutes": self.sla_minutes,
            "icon": self.icon,
            "is_active": self.is_active,
        }


class EmergencyCase(Base):
    __tablename__ = "emergency_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), unique=True, nullable=False, index=True)
    reference_no = Column(String(32), unique=True, nullable=False, index=True)
    reporter_id = Column(String(64), nullable=False, index=True)
    reporter_name = Column(String(100), nullable=False)
    reporter_phone = Column(String(20), nullable=False, index=True)
    
    category_id = Column(String(50), ForeignKey("emergency_categories.id"), nullable=False)
    category_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    
    severity = Column(String(20), default="HIGH", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, UNASSESSED
    suggested_priority = Column(String(20), default="HIGH", nullable=False)
    triage_reason = Column(Text, nullable=True)
    triage_overridden = Column(Boolean, default=False, nullable=False)
    triage_override_reason = Column(Text, nullable=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(Text, nullable=True)
    location_accuracy = Column(Float, nullable=True)
    location_corrected = Column(Boolean, default=False, nullable=False)
    
    affected_count = Column(Integer, nullable=True)
    immediate_hazards = Column(Text, nullable=True)
    accessibility_needs = Column(Text, nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    consent_location_sharing = Column(Boolean, default=True, nullable=False)
    
    status = Column(String(30), default="CREATED", nullable=False, index=True)
    
    assigned_dispatcher_id = Column(String(64), nullable=True)
    assigned_dispatcher_name = Column(String(100), nullable=True)
    assigned_responder_id = Column(String(64), nullable=True, index=True)
    assigned_responder_name = Column(String(100), nullable=True)
    
    resolution_summary = Column(Text, nullable=True)
    resolution_timestamp = Column(DateTime, nullable=True)
    reporter_feedback = Column(Text, nullable=True)
    reporter_rating = Column(Integer, nullable=True)
    
    idempotency_key = Column(String(128), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    category = relationship("EmergencyCategory")
    history = relationship("EmergencyHistory", back_populates="case", cascade="all, delete-orphan", order_by="EmergencyHistory.timestamp.asc()")
    attachments = relationship("EmergencyAttachment", back_populates="case", cascade="all, delete-orphan", order_by="EmergencyAttachment.created_at.desc()")
    messages = relationship("EmergencyMessage", back_populates="case", cascade="all, delete-orphan", order_by="EmergencyMessage.created_at.asc()")
    assignments = relationship("EmergencyAssignment", back_populates="case", cascade="all, delete-orphan", order_by="EmergencyAssignment.assigned_at.desc()")
    escalations = relationship("EmergencyEscalation", back_populates="case", cascade="all, delete-orphan", order_by="EmergencyEscalation.created_at.desc()")

    def to_dict(self, include_sensitive: bool = True):
        data = {
            "case_id": self.case_id,
            "reference_no": self.reference_no,
            "reporter_id": self.reporter_id,
            "reporter_name": self.reporter_name,
            "category_id": self.category_id,
            "category_name": self.category_name,
            "description": self.description,
            "severity": self.severity,
            "suggested_priority": self.suggested_priority,
            "triage_reason": self.triage_reason,
            "triage_overridden": self.triage_overridden,
            "triage_override_reason": self.triage_override_reason,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "location_accuracy": self.location_accuracy,
            "location_corrected": self.location_corrected,
            "affected_count": self.affected_count,
            "immediate_hazards": json.loads(self.immediate_hazards) if self.immediate_hazards and self.immediate_hazards.startswith("[") else ([h.strip() for h in self.immediate_hazards.split(",")] if self.immediate_hazards else []),
            "accessibility_needs": self.accessibility_needs,
            "status": self.status,
            "assigned_dispatcher_id": self.assigned_dispatcher_id,
            "assigned_dispatcher_name": self.assigned_dispatcher_name,
            "assigned_responder_id": self.assigned_responder_id,
            "assigned_responder_name": self.assigned_responder_name,
            "resolution_summary": self.resolution_summary,
            "resolution_timestamp": self.resolution_timestamp.isoformat() if self.resolution_timestamp else None,
            "reporter_feedback": self.reporter_feedback,
            "reporter_rating": self.reporter_rating,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "attachments_count": len(self.attachments) if self.attachments else 0,
        }
        if include_sensitive:
            data["reporter_phone"] = self.reporter_phone
            data["emergency_contact"] = self.emergency_contact
            data["consent_location_sharing"] = self.consent_location_sharing
        return data


class EmergencyHistory(Base):
    __tablename__ = "emergency_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("emergency_cases.case_id"), nullable=False, index=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    actor_id = Column(String(64), nullable=False)
    actor_role = Column(String(30), nullable=False)
    actor_name = Column(String(100), nullable=False)
    remarks = Column(Text, nullable=True)
    assignment_details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utcnow, nullable=False)

    case = relationship("EmergencyCase", back_populates="history")

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "actor_id": self.actor_id,
            "actor_role": self.actor_role,
            "actor_name": self.actor_name,
            "remarks": self.remarks,
            "assignment_details": json.loads(self.assignment_details) if self.assignment_details else None,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Responder(Base):
    __tablename__ = "responders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    responder_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    role = Column(String(50), nullable=False)  # Paramedic, Fire Officer, Disaster Response, etc.
    department = Column(String(100), nullable=False)
    service_area = Column(String(100), default="Pune Municipal Region", nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    verification_status = Column(String(20), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED, SUSPENDED
    availability_status = Column(String(20), default="AVAILABLE", nullable=False)  # AVAILABLE, BUSY, OFFLINE, UNAVAILABLE
    location_sharing_active = Column(Boolean, default=False, nullable=False)
    active_assignments_count = Column(Integer, default=0, nullable=False)
    max_active_assignments = Column(Integer, default=3, nullable=False)
    
    last_availability_update = Column(DateTime, default=utcnow, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    skills = relationship("ResponderSkill", back_populates="responder", cascade="all, delete-orphan")
    assignments = relationship("EmergencyAssignment", back_populates="responder")

    def to_dict(self, include_contact: bool = False):
        data = {
            "responder_id": self.responder_id,
            "name": self.name,
            "role": self.role,
            "department": self.department,
            "service_area": self.service_area,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "verification_status": self.verification_status,
            "availability_status": self.availability_status,
            "location_sharing_active": self.location_sharing_active,
            "active_assignments_count": self.active_assignments_count,
            "max_active_assignments": self.max_active_assignments,
            "skills": [s.skill_name for s in self.skills] if self.skills else [],
            "last_availability_update": self.last_availability_update.isoformat() if self.last_availability_update else None,
        }
        if include_contact:
            data["phone"] = self.phone
            data["email"] = self.email
        return data


class ResponderSkill(Base):
    __tablename__ = "responder_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    responder_id = Column(String(64), ForeignKey("responders.responder_id"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)

    responder = relationship("Responder", back_populates="skills")


class ResponderLocationLog(Base):
    __tablename__ = "responder_location_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    responder_id = Column(String(64), nullable=False, index=True)
    case_id = Column(String(64), nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=utcnow, nullable=False)


class EmergencyAssignment(Base):
    __tablename__ = "emergency_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(String(64), unique=True, nullable=False, index=True)
    case_id = Column(String(64), ForeignKey("emergency_cases.case_id"), nullable=False, index=True)
    responder_id = Column(String(64), ForeignKey("responders.responder_id"), nullable=False, index=True)
    assigned_by = Column(String(64), nullable=False)
    status = Column(String(20), default="OFFERED", nullable=False)  # OFFERED, ACCEPTED, REJECTED, COMPLETED
    rejection_reason = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=utcnow, nullable=False)
    responded_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    case = relationship("EmergencyCase", back_populates="assignments")
    responder = relationship("Responder", back_populates="assignments")

    def to_dict(self):
        return {
            "assignment_id": self.assignment_id,
            "case_id": self.case_id,
            "responder_id": self.responder_id,
            "assigned_by": self.assigned_by,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "responded_at": self.responded_at.isoformat() if self.responded_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class EmergencyAttachment(Base):
    __tablename__ = "emergency_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("emergency_cases.case_id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    attachment_type = Column(String(50), default="incident_evidence", nullable=False)  # incident_evidence, resolution_evidence
    uploaded_by = Column(String(64), nullable=False)
    uploaded_by_role = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    case = relationship("EmergencyCase", back_populates="attachments")

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "attachment_type": self.attachment_type,
            "uploaded_by_role": self.uploaded_by_role,
            "url": f"/api/emergency/{self.case_id}/attachments/{self.file_name}",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EmergencyMessage(Base):
    __tablename__ = "emergency_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("emergency_cases.case_id"), nullable=False, index=True)
    sender_id = Column(String(64), nullable=False)
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(30), nullable=False)  # citizen, dispatcher, responder
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    case = relationship("EmergencyCase", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender_name,
            "sender_role": self.sender_role,
            "message": self.message,
            "is_internal": self.is_internal,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EmergencyEscalation(Base):
    __tablename__ = "emergency_escalations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String(64), ForeignKey("emergency_cases.case_id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    escalated_by = Column(String(64), nullable=False)
    escalated_by_role = Column(String(30), nullable=False)
    status = Column(String(20), default="OPEN", nullable=False)  # OPEN, REVIEWED, RESOLVED
    created_at = Column(DateTime, default=utcnow, nullable=False)

    case = relationship("EmergencyCase", back_populates="escalations")

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "reason": self.reason,
            "escalated_by": self.escalated_by,
            "escalated_by_role": self.escalated_by_role,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EmergencyNotification(Base):
    __tablename__ = "emergency_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipient_id = Column(String(64), nullable=False, index=True)
    recipient_role = Column(String(30), nullable=False, index=True)
    case_id = Column(String(64), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "recipient_id": self.recipient_id,
            "recipient_role": self.recipient_role,
            "case_id": self.case_id,
            "event_type": self.event_type,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class NotificationDeliveryLog(Base):
    __tablename__ = "notification_delivery_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    notification_id = Column(Integer, nullable=True)
    channel = Column(String(20), nullable=False)  # in_app, sms, email
    status = Column(String(30), nullable=False)  # DELIVERED, FAILED, SKIPPED_UNCONFIGURED
    provider_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

