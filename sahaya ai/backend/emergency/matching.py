import math
from typing import List, Dict, Any
from .models import Responder, EmergencyCase


CATEGORY_SKILL_MAP = {
    "medical": ["First Aid", "BLS", "CPR", "Paramedic", "Emergency Medicine"],
    "road_accident": ["Extrication", "Trauma Care", "BLS", "First Aid", "Traffic Safety"],
    "fire": ["Firefighting", "Search & Rescue", "Hazmat", "Smoke Ventilation"],
    "flood": ["Water Rescue", "Flood Evacuation", "Disaster Relief", "Boat Operations"],
    "natural_disaster": ["Search & Rescue", "Disaster Relief", "Structural Assessment", "First Aid"],
    "public_safety": ["Crowd Control", "De-escalation", "Security", "Law Enforcement"],
    "missing_person": ["Search & Rescue", "Area K9 Search", "Community Canvassing"],
    "infrastructure_hazard": ["Civil Engineering", "Structural Safety", "Barricading", "PWD"],
    "electrical_hazard": ["High-Voltage Handling", "Electrical Safety", "Lineman Work"],
    "agricultural_emergency": ["Agri-Safety", "Pesticide Poisoning Response", "Farm Machinery Safety"],
    "animal_related": ["Veterinary First Aid", "Animal Rescue", "Wildlife Handling"],
    "other": ["General Emergency Assistance", "First Aid"]
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in kilometers between two GPS points."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0  # unknown distance penalty
    
    # Earth radius in kilometers
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def match_eligible_responders(
    case: EmergencyCase,
    all_responders: List[Responder],
    max_radius_km: float = 30.0
) -> Dict[str, Any]:
    """
    Intelligently ranks and filters verified, available responders for an emergency case.
    Considers:
    - Verification status (VERIFIED only)
    - Availability status (AVAILABLE only)
    - Active workload (active_assignments < max_active_assignments)
    - Skill match for category
    - Proximity (Haversine distance)
    - Department match
    """
    eligible = []
    required_skills = [s.lower() for s in CATEGORY_SKILL_MAP.get(case.category_id, ["general"])]
    
    for r in all_responders:
        # Rule 1: Strict Verification Filter
        if r.verification_status != "VERIFIED":
            continue
        
        # Rule 2: Strict Availability Filter
        if r.availability_status != "AVAILABLE":
            continue
            
        # Rule 3: Strict Workload Capacity Filter
        if r.active_assignments_count >= r.max_active_assignments:
            continue

        # Calculate Distance
        distance_km = haversine_distance_km(case.latitude, case.longitude, r.latitude, r.longitude)
        
        # Skill Matching
        responder_skills = [s.skill_name.lower() for s in r.skills] if r.skills else []
        matched_skills = [s for s in responder_skills if any(req in s or s in req for req in required_skills)]
        
        # Scoring System (0 - 100)
        # Skills: up to 40 pts
        skill_score = min(40, len(matched_skills) * 20) if matched_skills else 10
        
        # Proximity: up to 35 pts (closer = higher)
        if distance_km < 3.0:
            proximity_score = 35
        elif distance_km < 7.0:
            proximity_score = 28
        elif distance_km < 15.0:
            proximity_score = 20
        elif distance_km < 30.0:
            proximity_score = 12
        else:
            proximity_score = 5

        # Workload penalty: up to 15 pts (free = 15, 1 active = 10, 2 active = 5)
        workload_score = max(0, 15 - (r.active_assignments_count * 5))
        
        # Department alignment: 10 pts
        dept_match = case.category_name.lower() in r.department.lower() or r.department.lower() in case.category_name.lower()
        dept_score = 10 if dept_match else 5
        
        total_score = skill_score + proximity_score + workload_score + dept_score
        
        # Matching Reason explanation
        reasons = []
        if matched_skills:
            reasons.append(f"Possesses specialized skills ({', '.join(matched_skills[:2])})")
        if distance_km < 990:
            reasons.append(f"Located {distance_km} km away")
        reasons.append(f"Current active workload: {r.active_assignments_count}/{r.max_active_assignments}")
        
        eligible.append({
            "responder_id": r.responder_id,
            "name": r.name,
            "role": r.role,
            "department": r.department,
            "phone": r.phone,
            "distance_km": distance_km if distance_km < 990 else None,
            "matching_score": total_score,
            "active_assignments": r.active_assignments_count,
            "matched_skills": matched_skills,
            "all_skills": [s.skill_name for s in r.skills] if r.skills else [],
            "reasons": reasons,
            "status": r.availability_status
        })

    # Sort candidates by matching score descending, then distance ascending
    eligible.sort(key=lambda x: (-x["matching_score"], x["distance_km"] if x["distance_km"] is not None else 999))

    if not eligible:
        return {
            "eligible": [],
            "total": 0,
            "message": "No verified eligible responders are currently available."
        }

    return {
        "eligible": eligible,
        "total": len(eligible),
        "message": f"Found {len(eligible)} verified eligible responders matching category and area."
    }

