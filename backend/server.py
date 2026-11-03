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
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting SAHAYA AI Unified Backend on http://0.0.0.0:{port} ...")
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)

