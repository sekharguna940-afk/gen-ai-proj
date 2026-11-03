# SAHAYA AI — Intelligent Community Assistance, Emergency Response & Farmer Advisory Platform

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-15%20Passed-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SAHAYA AI** is a comprehensive, production-grade platform developed for unified civic assistance, life-critical emergency coordination, and intelligent farmer advisory. The platform seamlessly bridges citizens, emergency dispatchers, field responders, and farmers through a real-time, AI-assisted architecture.

---

## 🌟 Key Platform Modules

### 1. 🚨 Emergency Response & Coordination Module
- **12 Configurable Categories:** Medical, Road Accident, Fire, Flood, Natural Disaster, Public Safety, Missing Person, Infrastructure Hazard, Electrical Hazard, Agricultural Emergency, Animal Emergency, and Other.
- **Rule-Based Triage Engine:** Transparent, non-clinical prioritization (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with explainable triage reasons and human-override audit logs.
- **Geospatial & Skill-Based Responder Matching:** Haversine distance, department alignment, and active workload scoring (0–100) ensuring verified responders are deployed accurately.
- **Server-Side Atomic Reference:** Unique collision-free identifiers (e.g., `EMG-2026-00001`) generated on the server.
- **Real-Time WebSocket Dispatch:** Bidirectional WebSocket channels for immediate incident broadcasts, dispatcher alerts, and telemetry.
- **Duplicate Guard:** Idempotency keys and 90-second time-window protection against duplicate accidental reports.
- **National 112 Helpline Integration:** Prominent emergency warnings and official government directories (112, 100, 101, 108, 1077, 1091, 1098).

### 2. 🌾 Kisaan Saathi Farmer Portal & Crop AI
- **AI-Powered Crop Disease Prediction:** Computer vision & classifier pipeline diagnosing plant health from leaf images with immediate advisory.
- **Water Footprint Estimator:** Machine learning regression calculating daily water requirements by crop variety, soil type, and acreage.
- **Real-Time Government Schemes:** Live search and filtering of central and state agricultural welfare schemes.
- **Farm Record Management:** Digital farm profiling, crop cycle tracking, and advisory request logs.

### 3. 🏙️ CivicAI Issue Resolution
- **Citizen Municipal Complaints:** Geotagged civic issue reporting (potholes, garbage, broken streetlights).
- **Public Upvoting & Tracking:** Community validation, status timeline, and department routing.

---

## 👥 Multi-Role User Portals

| Role | Primary Dashboard | Key Actions |
| :--- | :--- | :--- |
| **Citizen** | `/` (Home) & `/emergency` | Report emergencies, track personal cases, report civic issues |
| **Farmer** | `/dashboard/farmer` | Diagnose crop diseases, calculate irrigation, apply for schemes |
| **Dispatcher / Admin** | `/emergency/operations` | Manage emergency queues, override triage, assign responders, view analytics |
| **Field Worker / Responder** | `/responder` | Accept deployments, stream location, mark on-scene, submit resolutions |

---

## 📂 Repository File Structure

```text
gen-ai-proj/
├── backend/                    # Unified Production Backend (FastAPI + ML + SQLite)
│   ├── emergency/              # Emergency response engine (triage, matching, models, router)
│   ├── Disease prediction Model/ # Crop disease classification weights & indices
│   ├── Water Footprint Model/  # Water requirement estimator models & datasets
│   ├── ml/ & model/            # Civic classification & fast inference models
│   ├── static/                 # Static assets for agricultural portal
│   ├── templates/              # Jinja2 templates for agricultural portal
│   ├── app.py                  # Single Unified FastAPI entry point (94 routes)
│   ├── civic_router.py         # Civic complaints and authentication endpoints
│   ├── server.py               # Uvicorn entry point runner
│   ├── FarmerAssistant.py      # Conversational farming advisory assistant
│   ├── prediction.py           # Crop disease inference pipeline
│   ├── schemes_data.py         # Real-time government welfare schemes dataset
│   ├── emergency_sahaya.db     # Persistent SQLite database (auto-seeded)
│   └── requirements.txt        # Backend Python dependencies
│
├── frontend/                   # Modern React 19 + Vite 7 Frontend
│   ├── src/
│   │   ├── components/         # Emergency SOS modal, helplines, layouts, topbar
│   │   ├── pages/              # Citizen, Farmer, Dispatcher, Responder portals
│   │   └── services/           # REST API client & WebSocket client
│   ├── index.html              # HTML entry point
│   ├── package.json            # Frontend NPM dependencies & scripts
│   └── vite.config.js          # Vite configuration
│
├── tests/
│   └── test_emergency_suite.py # 15 automated integration tests (all passing)
│
├── .gitignore                  # Production git exclusion rules
├── package.json                # Root workspace launcher delegating to frontend
├── requirements.txt            # Root Python dependencies
├── render.yaml                 # Render Blueprint for 1-click backend deployment
├── vercel.json                 # Vercel zero-config frontend deployment
├── start_all.bat               # 1-Click launcher for both services
├── start_backend.bat           # Dedicated backend launcher (Port 8000)
├── start_frontend.bat          # Dedicated frontend launcher (Port 5173)
└── run_tests.bat               # Automated integration test runner
```

---

## 🚀 Quick Start (Local Development)

### 1. One-Click Launch (Windows)
Double-click **`start_all.bat`** in the root directory. It automatically opens:
- **Backend Server:** `http://localhost:8000`
- **Frontend App:** `http://localhost:5173`

---

### 2. Manual Terminal Commands

#### Step A: Backend
```powershell
# Create & activate virtual environment (Python 3.11)
python -m venv .venv
.venv\Scripts\activate   # Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Unified Server
python backend/app.py
```
*API Swagger Documentation is available at: `http://localhost:8000/docs`*

#### Step B: Frontend
```powershell
cd frontend
npm install
npm run dev
```
*Access web interface at: `http://localhost:5173`*

---

## 🧪 Running Automated Tests

Run the complete 15-test emergency integration suite:
```powershell
.\run_tests.bat
# Or via Python:
python tests/test_emergency_suite.py
```
**Expected Output:** `Ran 15 tests in <1s ... OK`

---

## ☁️ Deployment Guide

### Option 1: Frontend on Vercel + Backend on Render (Recommended)

1. **Backend (Render):**
   - Connect repository `https://github.com/sekharguna940-afk/gen-ai-proj`.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python backend/app.py`
   - Copy your public HTTPS URL (e.g. `https://sahaya-backend.onrender.com`).

2. **Frontend (Vercel):**
   - Import repository on Vercel.
   - Root directory and build settings are automatically detected via `vercel.json`.
   - Set Environment Variables:
     - `VITE_API_BASE_URL` = `https://<your-render-backend>/api`
     - `VITE_WS_BASE_URL` = `wss://<your-render-backend>/api/ws/emergency`
     - `VITE_CROP_DETECTION_URL` = `https://<your-render-backend>`
   - Click **Deploy**.

---

## 🔒 Security & Safety Standards
- **Non-Clinical Disclaimer:** All automated triage suggestions and AI guidance state that they are advisory and cannot replace certified medical diagnosis or official rescue services.
- **Strict Tenant Isolation:** Citizens can only access emergency cases matching their verified credentials. Internal dispatch notes are shielded from public citizen feeds.
- **Audit Immutability:** Every case state progression is recorded with actor metadata, timestamps, and justifications.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

