import os
import sys
from pathlib import Path
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.chdir(str(BASE_DIR))
from app import app

if __name__ == "__main__":
    print("Starting SAHAYA AI Unified Backend on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)

