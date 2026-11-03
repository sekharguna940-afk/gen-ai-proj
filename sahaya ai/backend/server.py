import os
import sys
from pathlib import Path
import uvicorn

# Ensure root paths are in sys.path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent
KISAAN_DIR = PROJECT_ROOT / "Kisaan-Saathi-main"
if not (KISAAN_DIR / "app.py").exists() and (KISAAN_DIR / "Kisaan-Saathi-main" / "app.py").exists():
    KISAAN_DIR = KISAAN_DIR / "Kisaan-Saathi-main"

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(KISAAN_DIR) not in sys.path:
    sys.path.insert(0, str(KISAAN_DIR))

# Import app from Kisaan-Saathi app.py which now includes Emergency and Civic modules
os.chdir(str(KISAAN_DIR))
from app import app

if __name__ == "__main__":
    print("Starting SAHAYA AI Unified Backend on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)

