from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import EmergencyCategory, Responder, ResponderSkill, EmergencySequence


INITIAL_CATEGORIES = [
    {
        "id": "medical",
        "name": "Medical emergency",
        "description": "Urgent life-threatening medical trauma, cardiac arrest, respiratory distress, or severe illness.",
        "default_severity": "CRITICAL",
        "requires_photo": False,
        "department": "Emergency Medical Services (EMS)",
        "sla_minutes": 15,
        "icon": "HeartPulse"
    },
    {
        "id": "road_accident",
        "name": "Road accident",
        "description": "Vehicular collision, pedestrian impact, trapped passenger, or major traffic trauma.",
        "default_severity": "CRITICAL",
        "requires_photo": False,
        "department": "Traffic & Emergency Medical Rescue",
        "sla_minutes": 15,
        "icon": "CarFront"
    },
    {
        "id": "fire",
        "name": "Fire emergency",
        "description": "Active building, industrial, forest, or vehicle fire; smoke inhalation hazards.",
        "default_severity": "CRITICAL",
        "requires_photo": False,
        "department": "Fire & Rescue Department",
        "sla_minutes": 10,
        "icon": "Flame"
    },
    {
        "id": "flood",
        "name": "Flood and waterlogging",
        "description": "Severe inundation, stranded citizens, rising river levels, or flash flooding.",
        "default_severity": "HIGH",
        "requires_photo": False,
        "department": "Disaster Management & Flood Relief",
        "sla_minutes": 30,
        "icon": "Waves"
    },
    {
        "id": "natural_disaster",
        "name": "Natural disaster",
        "description": "Earthquake, cyclone, severe storm, landslide, or building collapse.",
        "default_severity": "CRITICAL",
        "requires_photo": False,
        "department": "Disaster Management Authority",
        "sla_minutes": 20,
        "icon": "Tornado"
    },
    {
        "id": "public_safety",
        "name": "Public safety incident",
        "description": "Active violence, harassment, stampede risk, or severe public disorder.",
        "default_severity": "HIGH",
        "requires_photo": False,
        "department": "Public Safety & Law Enforcement Liaison",
        "sla_minutes": 20,
        "icon": "ShieldAlert"
    },
    {
        "id": "missing_person",
        "name": "Missing person",
        "description": "Missing child, vulnerable elderly, or lost person in hazardous environment.",
        "default_severity": "HIGH",
        "requires_photo": True,
        "department": "Search & Rescue & Police Liaison",
        "sla_minutes": 45,
        "icon": "UserSearch"
    },
    {
        "id": "infrastructure_hazard",
        "name": "Infrastructure hazard",
        "description": "Bridge crack, road cave-in, open manhole, wall collapse hazard.",
        "default_severity": "MEDIUM",
        "requires_photo": True,
        "department": "PWD & Municipal Infrastructure",
        "sla_minutes": 60,
        "icon": "Building"
    },
    {
        "id": "electrical_hazard",
        "name": "Electrical hazard",
        "description": "Fallen high-tension wire, exploding transformer, sparking electrical pole.",
        "default_severity": "CRITICAL",
        "requires_photo": False,
        "department": "Electricity Board (MSEDCL)",
        "sla_minutes": 20,
        "icon": "Zap"
    },
    {
        "id": "agricultural_emergency",
        "name": "Agricultural emergency",
        "description": "Tractor overturn, severe pesticide exposure, farm silo collapse, or crop fire.",
        "default_severity": "HIGH",
        "requires_photo": False,
        "department": "Rural Assistance & Agricultural Rescue",
        "sla_minutes": 30,
        "icon": "Tractor"
    },
    {
        "id": "animal_related",
        "name": "Animal-related emergency",
        "description": "Rabid or dangerous animal attack, trapped livestock, wild animal intrusion.",
        "default_severity": "MEDIUM",
        "requires_photo": False,
        "department": "Animal Control & Forest Department",
        "sla_minutes": 45,
        "icon": "PawPrint"
    },
    {
        "id": "other",
        "name": "Other emergency",
        "description": "Other urgent community emergencies requiring coordinated assistance.",
        "default_severity": "MEDIUM",
        "requires_photo": False,
        "department": "General Emergency Operations",
        "sla_minutes": 60,
        "icon": "HelpCircle"
    }
]

INITIAL_RESPONDERS = [
    {
        "responder_id": "RSP-001",
        "name": "Dr. Ananya Sharma",
        "phone": "+919822011111",
        "email": "ananya.sharma@sahaya-response.org",
        "role": "Paramedic / Trauma Specialist",
        "department": "Emergency Medical Services",
        "service_area": "Pune Central & Swargate",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "verification_status": "VERIFIED",
        "availability_status": "AVAILABLE",
        "skills": ["First Aid", "BLS", "CPR", "Paramedic", "Trauma Care"]
    },
    {
        "responder_id": "RSP-002",
        "name": "Vikram Patil",
        "phone": "+919822022222",
        "email": "vikram.patil@sahaya-response.org",
        "role": "Fire & Rescue Captain",
        "department": "Fire & Rescue Department",
        "service_area": "Pune West & Kothrud",
        "latitude": 18.5074,
        "longitude": 73.8077,
        "verification_status": "VERIFIED",
        "availability_status": "AVAILABLE",
        "skills": ["Firefighting", "Search & Rescue", "Hazmat", "Smoke Ventilation", "Extrication"]
    },
    {
        "responder_id": "RSP-003",
        "name": "Rajesh Deshmukh",
        "phone": "+919822033333",
        "email": "rajesh.deshmukh@sahaya-response.org",
        "role": "High-Voltage Emergency Lineman",
        "department": "Electricity Board (MSEDCL)",
        "service_area": "Pune East & Hadapsar",
        "latitude": 18.5089,
        "longitude": 73.9259,
        "verification_status": "VERIFIED",
        "availability_status": "AVAILABLE",
        "skills": ["High-Voltage Handling", "Electrical Safety", "Lineman Work"]
    },
    {
        "responder_id": "RSP-004",
        "name": "Sunita Jadhav",
        "phone": "+919822044444",
        "email": "sunita.jadhav@sahaya-response.org",
        "role": "Disaster Relief Officer",
        "department": "Disaster Management & Flood Relief",
        "service_area": "Mula-Mutha River Corridor & Pune North",
        "latitude": 18.5314,
        "longitude": 73.8446,
        "verification_status": "VERIFIED",
        "availability_status": "AVAILABLE",
        "skills": ["Water Rescue", "Flood Evacuation", "Disaster Relief", "Boat Operations", "Search & Rescue"]
    },
    {
        "responder_id": "RSP-005",
        "name": "Amit Shinde",
        "phone": "+919822055555",
        "email": "amit.shinde@sahaya-response.org",
        "role": "Agricultural Hazard Specialist",
        "department": "Rural Assistance & Agricultural Rescue",
        "service_area": "Pune South & Khed Shivapur",
        "latitude": 18.4204,
        "longitude": 73.8667,
        "verification_status": "VERIFIED",
        "availability_status": "AVAILABLE",
        "skills": ["Agri-Safety", "Pesticide Poisoning Response", "Farm Machinery Safety", "First Aid"]
    },
    {
        "responder_id": "RSP-006",
        "name": "Dr. Priya Nair",
        "phone": "+919822066666",
        "email": "priya.nair@sahaya-response.org",
        "role": "Veterinary Medical Officer",
        "department": "Animal Control & Veterinary Services",
        "service_area": "Pune Municipal Region",
        "latitude": 18.5100,
        "longitude": 73.8500,
        "verification_status": "VERIFIED",
        "availability_status": "AVAILABLE",
        "skills": ["Veterinary First Aid", "Animal Rescue", "Wildlife Handling"]
    }
]


def init_db_and_seed(db: Session = None):
    """Initializes tables and seeds initial categories and responders if absent."""
    Base.metadata.create_all(bind=engine)
    
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. Seed Categories
        for cat_data in INITIAL_CATEGORIES:
            existing = db.query(EmergencyCategory).filter_by(id=cat_data["id"]).first()
            if not existing:
                cat = EmergencyCategory(**cat_data)
                db.add(cat)
            else:
                # Update properties
                for k, v in cat_data.items():
                    setattr(existing, k, v)

        # 2. Seed Responders
        for resp_data in INITIAL_RESPONDERS:
            existing = db.query(Responder).filter_by(responder_id=resp_data["responder_id"]).first()
            skills = resp_data.get("skills", [])
            data_copy = {k: v for k, v in resp_data.items() if k != "skills"}
            
            if not existing:
                resp = Responder(**data_copy)
                db.add(resp)
                db.flush()
                for skill_name in skills:
                    db.add(ResponderSkill(responder_id=resp.responder_id, skill_name=skill_name))
            else:
                # Update properties
                for k, v in data_copy.items():
                    setattr(existing, k, v)

        db.commit()
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    init_db_and_seed()
    print("Emergency database schema initialized and seeded successfully.")

