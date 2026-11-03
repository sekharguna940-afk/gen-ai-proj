import os
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Path to database file
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.environ.get("EMERGENCY_DB_PATH", os.path.join(BACKEND_DIR, "emergency_sahaya.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_emergency_reference(db_session, year: int = None) -> str:
    """
    Atomically generates a human-readable emergency reference: EMG-YYYY-XXXXX
    Example: EMG-2026-00001
    """
    from .models import EmergencySequence

    if year is None:
        year = datetime.now(timezone.utc).year

    # Acquire lock / row for the current year
    seq = db_session.query(EmergencySequence).filter_by(year=year).with_for_update().first() if hasattr(db_session.query(EmergencySequence), "with_for_update") else db_session.query(EmergencySequence).filter_by(year=year).first()
    
    if not seq:
        seq = EmergencySequence(year=year, last_sequence=1)
        db_session.add(seq)
        seq_num = 1
    else:
        seq.last_sequence += 1
        seq_num = seq.last_sequence

    db_session.commit()
    return f"EMG-{year}-{seq_num:05d}"

