import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(tags=["civic"])

# In-memory storage for local runtime persistence
_stored_complaints = [
    {
        "id": "CVC-2026-001234",
        "category": "road_issue",
        "subCategory": "pothole",
        "severity": "high",
        "status": "in_progress",
        "description": "Large pothole on FC Road near Fergusson College causing traffic disruption and posing danger to two-wheelers.",
        "aiDescription": "Deep pothole measuring approximately 2x3 feet detected on main arterial road. Risk of vehicle damage and accidents.",
        "priorityScore": 85,
        "confidence": 0.94,
        "latitude": 18.5204,
        "longitude": 73.8567,
        "address": "FC Road, Near Fergusson College, Pune 411004",
        "department": "PWD",
        "assignedTo": "Rajesh Kumar",
        "upvotes": 24,
        "createdAt": "2026-02-25T08:30:00Z",
        "resolvedAt": None,
        "estimatedResolution": "2-3 days",
        "images": ["/placeholder-pothole.jpg"],
        "statusHistory": [
            {"status": "submitted", "timestamp": "2026-02-25T08:30:00Z", "by": "Citizen"},
            {"status": "assigned", "timestamp": "2026-02-25T09:15:00Z", "by": "System"},
            {"status": "in_progress", "timestamp": "2026-02-25T14:00:00Z", "by": "Rajesh Kumar"},
        ]
    },
    {
        "id": "CVC-2026-001235",
        "category": "lighting",
        "subCategory": "broken_streetlight",
        "severity": "medium",
        "status": "assigned",
        "description": "Streetlight near Aga Khan Palace entrance has been non-functional for the past week.",
        "aiDescription": "Non-functional streetlight identified. Area becomes completely dark after sunset.",
        "priorityScore": 62,
        "confidence": 0.89,
        "latitude": 18.5525,
        "longitude": 73.9015,
        "address": "Aga Khan Palace Road, Nagar Road, Pune 411006",
        "department": "ELEC",
        "assignedTo": "Suresh Patil",
        "upvotes": 8,
        "createdAt": "2026-02-26T10:45:00Z",
        "resolvedAt": None,
        "estimatedResolution": "1-2 days",
        "images": ["/placeholder-streetlight.jpg"],
        "statusHistory": [
            {"status": "submitted", "timestamp": "2026-02-26T10:45:00Z", "by": "Citizen"},
            {"status": "assigned", "timestamp": "2026-02-26T11:30:00Z", "by": "System"},
        ]
    },
    {
        "id": "CVC-2026-001236",
        "category": "waste",
        "subCategory": "garbage_accumulation",
        "severity": "critical",
        "status": "submitted",
        "description": "Massive garbage heap at the corner of MG Road and East Street. Strong odors and pest infestations.",
        "aiDescription": "Large-scale garbage accumulation detected in a public area. Immediate health hazard.",
        "priorityScore": 92,
        "confidence": 0.97,
        "latitude": 18.5105,
        "longitude": 73.8748,
        "address": "MG Road Corner, Camp Area, Pune 411001",
        "department": "SANIT",
        "assignedTo": None,
        "upvotes": 45,
        "createdAt": "2026-02-27T06:15:00Z",
        "resolvedAt": None,
        "estimatedResolution": "24 hours",
        "images": ["/placeholder-garbage.jpg"],
        "statusHistory": [
            {"status": "submitted", "timestamp": "2026-02-27T06:15:00Z", "by": "Citizen"}
        ]
    }
]


@router.post("/auth/send-otp")
@router.post("/api/auth/send-otp")
def send_otp(payload: Dict[str, Any]):
    phone = payload.get("phone", "")
    return {
        "success": True,
        "message": f"Verification OTP dispatched to {phone}. For evaluation/demo access, your OTP is 123456.",
        "otp": "123456",
        "expires_in": 300
    }


@router.post("/auth/verify-otp")
@router.post("/api/auth/verify-otp")
def verify_otp(payload: Dict[str, Any]):
    phone = payload.get("phone", "")
    otp = str(payload.get("otp", "")).strip()
    if otp in ["123456", "000000"] or len(otp) == 6:
        token = f"sahaya_jwt_{uuid.uuid4().hex}"
        return {
            "success": True,
            "token": token,
            "user": {
                "id": f"usr_{phone[-10:]}" if phone else "usr_demo",
                "phone": phone or "+919876543210",
                "role": payload.get("role", "citizen")
            }
        }
    raise HTTPException(status_code=400, detail="Invalid OTP code. Please use 123456.")


@router.get("/complaints")
@router.get("/api/complaints")
def get_complaints(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None)
):
    results = list(_stored_complaints)
    if status:
        results = [c for c in results if c["status"] == status]
    if category:
        results = [c for c in results if c["category"] == category]
    if severity:
        results = [c for c in results if c["severity"] == severity]

    return {
        "success": True,
        "complaints": results,
        "total": len(results),
        "pagination": {"page": 1, "limit": 50, "total": len(results), "pages": 1}
    }


@router.get("/complaints/nearby")
@router.get("/api/complaints/nearby")
def get_nearby_complaints(lat: float = 18.52, lng: float = 73.85, radius: float = 500):
    return {
        "success": True,
        "complaints": _stored_complaints[:5],
        "total": min(5, len(_stored_complaints))
    }


@router.get("/complaints/{complaint_id}")
@router.get("/api/complaints/{complaint_id}")
def get_complaint_by_id(complaint_id: str):
    complaint = next((c for c in _stored_complaints if c["id"] == complaint_id), None)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {"success": True, "complaint": complaint}


@router.post("/complaints")
@router.post("/api/complaints")
def submit_complaint(data: Dict[str, Any]):
    new_id = f"CVC-2026-{len(_stored_complaints) + 1237:06d}"
    item = {
        "id": new_id,
        "category": data.get("category", "road_issue"),
        "subCategory": data.get("subCategory", "other"),
        "severity": data.get("severity", "medium"),
        "status": "submitted",
        "description": data.get("userNote") or data.get("description", "Civic issue reported."),
        "aiDescription": data.get("description", ""),
        "priorityScore": data.get("priorityScore", 70),
        "confidence": data.get("confidence", 0.90),
        "latitude": data.get("latitude", 18.5204),
        "longitude": data.get("longitude", 73.8567),
        "address": data.get("address", "Pune, Maharashtra"),
        "department": data.get("department", "PWD"),
        "assignedTo": None,
        "upvotes": 0,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "resolvedAt": None,
        "estimatedResolution": "2-3 days",
        "images": [data.get("s3Key")] if data.get("s3Key") else [],
        "statusHistory": [
            {"status": "submitted", "timestamp": datetime.now(timezone.utc).isoformat(), "by": data.get("userName", "Citizen")}
        ]
    }
    _stored_complaints.insert(0, item)
    return {"success": True, "complaintId": new_id, "complaint": item}


@router.patch("/complaints/{complaint_id}/status")
@router.patch("/api/complaints/{complaint_id}/status")
def update_complaint_status(complaint_id: str, payload: Dict[str, Any]):
    complaint = next((c for c in _stored_complaints if c["id"] == complaint_id), None)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    new_status = payload.get("status", complaint["status"])
    complaint["status"] = new_status
    complaint["statusHistory"].append({
        "status": new_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "by": payload.get("notes", "System")
    })
    return {"success": True, "message": f"Complaint {complaint_id} updated to {new_status}"}


@router.post("/complaints/{complaint_id}/upvote")
@router.post("/api/complaints/{complaint_id}/upvote")
def upvote_complaint(complaint_id: str):
    complaint = next((c for c in _stored_complaints if c["id"] == complaint_id), None)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint["upvotes"] = complaint.get("upvotes", 0) + 1
    return {"success": True, "upvotes": complaint["upvotes"], "newPriorityScore": complaint.get("priorityScore", 70) + 2}


@router.get("/dashboard/stats")
@router.get("/api/dashboard/stats")
def get_dashboard_stats():
    total = len(_stored_complaints)
    resolved = sum(1 for c in _stored_complaints if c["status"] == "resolved")
    in_progress = sum(1 for c in _stored_complaints if c["status"] == "in_progress")
    critical = sum(1 for c in _stored_complaints if c["severity"] == "critical")
    return {
        "success": True,
        "stats": {
            "totalComplaints": total,
            "resolvedComplaints": resolved,
            "inProgressComplaints": in_progress,
            "criticalIssues": critical,
            "avgResolutionHours": 28.5,
            "citizenSatisfaction": 94
        }
    }


@router.get("/worker/assignments")
@router.get("/api/worker/assignments")
def get_worker_assignments():
    assignments = [c for c in _stored_complaints if c["status"] in ["assigned", "in_progress"]]
    return {"success": True, "assignments": assignments}


@router.post("/upload/presign")
@router.post("/api/upload/presign")
def presign_upload(payload: Dict[str, Any]):
    inc_id = f"inc_{uuid.uuid4().hex[:8]}"
    return {
        "success": True,
        "incident_id": inc_id,
        "upload_url": f"http://localhost:8000/api/mock-upload/{inc_id}",
        "s3_key": f"complaints/{inc_id}.jpg"
    }

