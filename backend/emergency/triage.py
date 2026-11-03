import re
from typing import Dict, Any, Tuple


# Critical hazard indicators
CRITICAL_HAZARDS = {
    "fire", "live_wire", "electrical_spark", "gas_leak", "explosion",
    "structural_collapse", "trapped_person", "severe_bleeding", "unconscious",
    "drowning", "toxic_chemical", "flood_submersion", "active_violence"
}

# High hazard indicators
HIGH_HAZARDS = {
    "smoke", "road_blockage", "waterlogging", "fallen_tree", "damaged_pole",
    "animal_attack", "landslide", "injured_person", "open_manhole"
}

# Critical keywords in description
CRITICAL_KEYWORDS = [
    r"\bunconscious\b", r"\bbleeding heavily\b", r"\bhead injury\b", r"\bheart attack\b",
    r"\bnot breathing\b", r"\bchoking\b", r"\bfire\b", r"\bexplosion\b",
    r"\btrapped\b", r"\belectrocuted\b", r"\bgas leak\b", r"\bdrowning\b",
    r"\bcrushed\b", r"\bcollapsed\b", r"\bactive shooter\b", r"\bstabbing\b"
]

HIGH_KEYWORDS = [
    r"\bfracture\b", r"\bbroken bone\b", r"\bburns\b", r"\baccident\b",
    r"\bwaterlogging\b", r"\bflood\b", r"\bsparking\b", r"\bwild animal\b",
    r"\bsnake bite\b", r"\bmissing child\b", r"\belderly fell\b"
]


def assess_emergency_triage(
    category_id: str,
    description: str,
    affected_count: int = None,
    immediate_hazards: list = None,
    accessibility_needs: str = "",
    default_severity: str = "HIGH"
) -> Tuple[str, str, float]:
    """
    Transparent, rule-based triage engine with confidence scoring.
    Returns: (suggested_severity, triage_reason, confidence_score)

    Triage levels: CRITICAL, HIGH, MEDIUM, LOW, UNASSESSED
    Notice: Non-clinical decision support only. Never claims clinical diagnosis.
    """
    hazards = [str(h).lower().strip() for h in (immediate_hazards or [])]
    desc_lower = (description or "").lower()
    
    reasons = []
    severity_score = 0
    confidence = 0.85

    # 1. Immediate Critical Hazards
    critical_found = [h for h in hazards if any(c in h for c in CRITICAL_HAZARDS)]
    if critical_found:
        severity_score += 40
        reasons.append(f"Immediate life-safety hazard detected ({', '.join(critical_found)})")

    # 2. Critical Keywords in Description
    crit_keyword_matches = [kw for kw in CRITICAL_KEYWORDS if re.search(kw, desc_lower)]
    if crit_keyword_matches:
        severity_score += 35
        reasons.append("High-acuity emergency terms identified in incident description")

    # 3. Affected Count
    if affected_count and affected_count > 3:
        severity_score += 25
        reasons.append(f"Multiple affected individuals ({affected_count} persons reported)")
    elif affected_count and affected_count > 1:
        severity_score += 15
        reasons.append(f"Multiple casualties/affected ({affected_count} persons)")

    # 4. Category-specific baseline
    if category_id in ["medical", "fire", "natural_disaster", "road_accident"]:
        severity_score += 20
        reasons.append(f"Inherently urgent category baseline ({category_id.replace('_', ' ').title()})")
    elif category_id in ["electrical_hazard", "flood", "public_safety", "missing_person"]:
        severity_score += 15
    else:
        severity_score += 5

    # 5. Vulnerability / Accessibility Requirements
    if accessibility_needs and len(accessibility_needs.strip()) > 3:
        severity_score += 15
        reasons.append("Special accessibility or vulnerable assistance requirement noted")

    # Determine severity based on calibrated score
    if severity_score >= 50:
        level = "CRITICAL"
        confidence = 0.95
    elif severity_score >= 30:
        level = "HIGH"
        confidence = 0.88
    elif severity_score >= 15:
        level = "MEDIUM"
        confidence = 0.80
    else:
        level = default_severity or "LOW"
        confidence = 0.75

    if not reasons:
        reasons.append(f"Assigned default priority baseline for {category_id.replace('_', ' ')}")

    final_reason = "; ".join(reasons) + ". (Rule-based operational triage; requires human dispatcher verification)"
    return level, final_reason, confidence

