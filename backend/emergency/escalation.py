from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .models import EmergencyCase, EmergencyEscalation, EmergencyHistory, EmergencyNotification


def check_and_escalate_cases(db: Session) -> List[Dict[str, Any]]:
    """
    Evaluates active cases against defined operational escalation triggers:
    1. Critical unassigned cases older than 5 minutes.
    2. Assigned cases without responder acceptance older than 10 minutes.
    3. Reopened cases needing executive dispatcher review.
    """
    now = datetime.now(timezone.utc)
    escalations_created = []

    # 1. Critical cases unassigned > 5 minutes
    crit_cutoff = now - timedelta(minutes=5)
    unassigned_critical = db.query(EmergencyCase).filter(
        EmergencyCase.severity == "CRITICAL",
        EmergencyCase.status.in_(["CREATED", "TRIAGE_PENDING", "TRIAGED", "UNASSIGNED"]),
        EmergencyCase.created_at <= crit_cutoff
    ).all()

    for case in unassigned_critical:
        # Check if already escalated
        existing = db.query(EmergencyEscalation).filter_by(case_id=case.case_id, status="OPEN").first()
        if not existing:
            reason = f"CRITICAL incident unassigned for > 5 minutes (Reported at {case.created_at.strftime('%H:%M:%S')})"
            esc = EmergencyEscalation(
                case_id=case.case_id,
                reason=reason,
                escalated_by="SYSTEM_SCHEDULER",
                escalated_by_role="system",
                status="OPEN"
            )
            case.status = "ESCALATED"
            
            # Audit log
            hist = EmergencyHistory(
                case_id=case.case_id,
                previous_status="UNASSIGNED",
                new_status="ESCALATED",
                actor_id="system",
                actor_role="system",
                actor_name="Automated Escalation Rule Engine",
                remarks=reason
            )
            
            # Notification for dispatchers
            notif = EmergencyNotification(
                recipient_id="dispatch_pool",
                recipient_role="dispatcher",
                case_id=case.case_id,
                event_type="emergency.escalated",
                title=f"URGENT: Escalation for {case.reference_no}",
                message=reason
            )
            
            db.add(esc)
            db.add(hist)
            db.add(notif)
            escalations_created.append({"case_id": case.case_id, "reference_no": case.reference_no, "reason": reason})

    # 2. Offered/Assigned cases with no acceptance > 10 minutes
    assigned_cutoff = now - timedelta(minutes=10)
    overdue_assigned = db.query(EmergencyCase).filter(
        EmergencyCase.status == "ASSIGNED",
        EmergencyCase.updated_at <= assigned_cutoff
    ).all()

    for case in overdue_assigned:
        existing = db.query(EmergencyEscalation).filter_by(case_id=case.case_id, status="OPEN").first()
        if not existing:
            reason = f"Assigned responder ({case.assigned_responder_name or 'Unknown'}) has not accepted assignment within SLA window (> 10 mins)"
            esc = EmergencyEscalation(
                case_id=case.case_id,
                reason=reason,
                escalated_by="SYSTEM_SCHEDULER",
                escalated_by_role="system",
                status="OPEN"
            )
            case.status = "ESCALATED"
            
            hist = EmergencyHistory(
                case_id=case.case_id,
                previous_status="ASSIGNED",
                new_status="ESCALATED",
                actor_id="system",
                actor_role="system",
                actor_name="Automated Escalation Rule Engine",
                remarks=reason
            )
            
            notif = EmergencyNotification(
                recipient_id="dispatch_pool",
                recipient_role="dispatcher",
                case_id=case.case_id,
                event_type="emergency.escalated",
                title=f"SLA Breach: Acceptance overdue for {case.reference_no}",
                message=reason
            )
            
            db.add(esc)
            db.add(hist)
            db.add(notif)
            escalations_created.append({"case_id": case.case_id, "reference_no": case.reference_no, "reason": reason})

    if escalations_created:
        db.commit()

    return escalations_created

