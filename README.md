# SAHAYA AI — Intelligent Community Assistance, Emergency Response & Farmer Advisory Platform

[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.5+-F7931E.svg?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/Tests-15%20Passed-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Final-Year B.Tech Capstone Project**  
> **SAHAYA AI** is an enterprise-grade, multi-tenant platform uniting **Life-Critical Emergency Response & Geospatial Coordination**, **Civic Grievance Redressal**, and **Intelligent Agricultural Advisory (Kisaan Saathi)** into a single unified architecture.

---

## 📑 Table of Contents
1. [Executive Summary & System Architecture](#-executive-summary--system-architecture)
2. [Core Platform Pillars](#-core-platform-pillars)
   - [Pillar 1: Emergency Response & Coordination](#pillar-1-emergency-response--coordination-system)
   - [Pillar 2: Kisaan Saathi Farmer Advisory & Crop AI](#pillar-2-kisaan-saathi-farmer-portal--crop-ai)
   - [Pillar 3: CivicAI Municipal Grievance Redressal](#pillar-3-civicai-municipal-grievance-redressal)
3. [Multi-Role User Portals & Workflows](#-multi-role-user-portals--workflows)
4. [Technology Stack](#-technology-stack)
5. [Repository File & Directory Structure](#-repository-file--directory-structure)
6. [API Specification & Endpoints](#-api-specification--endpoints)
7. [Local Setup & Execution Guide](#-local-setup--execution-guide)
8. [Automated Testing & Quality Assurance](#-automated-testing--quality-assurance)
9. [Cloud Deployment Architecture](#-cloud-deployment-architecture)
10. [Ethics, Safety & Privacy Guardrails](#-ethics-safety--privacy-guardrails)

---

## 🏛️ Executive Summary & System Architecture

Modern civic and emergency ecosystems suffer from severe fragmentation: municipal complaints are siloed, emergency responders lack real-time geospatial skill matching, and rural farmers lack immediate machine-learning crop guidance. **SAHAYA AI** bridges these gaps by providing:

1. A transparent, non-clinical **Emergency Operations Coordination Center** with automated Haversine geospatial responder dispatch.
2. An **Agricultural Computer Vision & Machine Learning Suite** providing instant crop disease diagnosis, irrigation water footprint modeling, and live welfare schemes search.
3. A citizen-facing **Municipal Grievance Portal** with issue tracking and upvoting.

### 📐 High-Level Architecture Diagram

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  CLIENT APPLICATIONS                   │
                                  │           React 19 + Vite 7 SPA (Port 5173)            │
                                  └───────────────┬────────────────────────┬───────────────┘
                                                  │                        │
                                   REST / JSON    │                        │  WebSockets
                                                  ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             SAHAYA AI UNIFIED BACKEND SERVER                             │
│                              FastAPI Application (Port 8000)                             │
├──────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│   EMERGENCY MODULE           │    CIVIC MANAGEMENT         │   KISAAN SAATHI FARMER AI   │
│   • 12 Configured Categories │    • Municipal Complaints   │   • Crop Disease Fast ML    │
│   • Rule-Based Triage Engine │    • JWT / Session Auth     │   • Water Footprint Regr.   │
│   • Haversine Matching (0-100│    • Department Routing     │   • Live Schemes (Data.gov) │
│   • SLA Escalation Monitor   │    • Citizen Upvoting       │   • Agronomy Chat Assistant │
│   • Atomic Sequence EMG-XXXX │    • Status History         │   • Open-Meteo Weather API  │
│   • WebSocket Telemetry Hub  │                             │                             │
├──────────────────────────────┴─────────────────────────────┴─────────────────────────────┤
│                                PERSISTENCE & DATA STORAGE                                │
│   • SQLite Database (emergency_sahaya.db) with SQLAlchemy 2.0 ORM                        │
│   • Pre-trained Serialized Models (.joblib, .pkl, .keras)                                │
│   • File Upload Storage (/uploads)                                                       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Core Platform Pillars

---

### Pillar 1: Emergency Response & Coordination System

The Emergency Response module handles internal incident intake, triage, dispatch coordination, responder assignment, live telemetry, and lifecycle closure.

#### 1. 12 Configurable Emergency Categories
Every category defines a dedicated default severity, responsible routing agency, service-level agreement (SLA), and requirement flags:

| # | Category Name | Default Severity | Routing Department | SLA | Icon | Mandatory Photo |
| :-: | :--- | :--- | :--- | :-: | :--- | :-: |
| 1 | **Medical emergency** | `CRITICAL` | Emergency Medical Services (EMS) | 15 min | `HeartPulse` | No |
| 2 | **Road accident** | `CRITICAL` | Traffic & Medical Rescue | 15 min | `CarFront` | No |
| 3 | **Fire emergency** | `CRITICAL` | Fire & Rescue Department | 10 min | `Flame` | No |
| 4 | **Flood and waterlogging** | `HIGH` | Disaster Management & Flood Relief | 30 min | `Waves` | No |
| 5 | **Natural disaster** | `CRITICAL` | Disaster Management Authority | 20 min | `Tornado` | No |
| 6 | **Public safety incident** | `HIGH` | Public Safety Liaison | 20 min | `ShieldAlert` | No |
| 7 | **Missing person** | `HIGH` | Search & Rescue Police Liaison | 45 min | `UserSearch` | **Yes** |
| 8 | **Infrastructure hazard** | `MEDIUM` | PWD & Municipal Infrastructure | 60 min | `Building` | **Yes** |
| 9 | **Electrical hazard** | `CRITICAL` | Electricity Board (MSEDCL) | 20 min | `Zap` | No |
| 10 | **Agricultural emergency** | `HIGH` | Rural Assistance & Rescue | 30 min | `Tractor` | No |
| 11 | **Animal-related emergency**| `MEDIUM` | Animal Control & Forest Dept | 45 min | `PawPrint` | No |
| 12 | **Other emergency** | `MEDIUM` | General Operations Command | 60 min | `HelpCircle` | No |

#### 2. Transparent Rule-Based Triage Engine
- **Non-Clinical Prioritization:** Assigns initial priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) using category baselines, affected casualty counts ($\ge 3 \rightarrow \text{CRITICAL}$), and explicit keyword hazard patterns (e.g., *unconscious, trapped, bleeding, gas leak, high voltage*).
- **Explainability:** Stores the exact deterministic rule reason (e.g., `Category baseline: CRITICAL; Casualty count: 4`).
- **Human Dispatcher Overrides:** Dispatchers can override severity at any time. Any override **mandates a recorded reason** stored permanently in the audit history.

#### 3. Geospatial & Skill-Based Matching Engine
When an incident is reported, the system scores and ranks all eligible field responders using a multi-factor weighting formula:

$$\text{Match Score} = \text{Distance Score}\,(50\%) + \text{Department Alignment}\,(25\%) + \text{Skill Overlap}\,(15\%) + \text{Workload Availability}\,(10\%)$$

- **Haversine Distance:** Calculates great-circle distance between incident GPS and responder GPS coordinates:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
- **Verified Responder Guard:** Responders with status `PENDING`, `REJECTED`, or `SUSPENDED` are strictly filtered out; only `VERIFIED` and `AVAILABLE` responders receive assignments.

#### 4. Server-Side Atomic Incident Reference Generation
- References follow the official format: **`EMG-YYYY-XXXXX`** (e.g., `EMG-2026-00001`).
- Generated atomically inside SQLite transaction locks using an incremental sequence table to eliminate client-side race conditions.

#### 5. Strict Validated Lifecycle State Machine
Arbitrary status changes are prevented. Every state transition is validated against legal operational flows and appended to an immutable audit log:

```text
[CREATED] ──► [ASSIGNED] ──► [ACCEPTED] ──► [RESPONDING] ──► [ON_SCENE] ──► [RESOLVED] ──► [CLOSED]
     │              │               │
     │              ▼               ▼
     └────────► [UNASSIGNED] ◄── [REJECTED]
                    ▲
                    │ (With Mandatory Reason)
              [REOPENED] ◄── [RESOLVED]
```

#### 6. Controlled Multi-Audience Messaging
- Incident messaging enforces data boundaries: **Citizen-visible messages** allow communication between the victim and responders.
- **Internal Dispatcher Notes** are strictly filtered out and never exposed to citizens.

---

### Pillar 2: Kisaan Saathi Farmer Portal & Crop AI

The agricultural portal equips farmers with instant artificial intelligence diagnostics and advisory tools:

#### 1. Crop Disease Detection Pipeline
- **Multi-Class Leaf Diagnosis:** Detects diseases across major crops (Tomato, Potato, Corn, Apple, Grape, Rice, Wheat).
- **Fast Resilient Inference:** Integrates a Scikit-Learn classifier (`fast_model.joblib`) backed by class indices (`class_indices.json`) and deep learning model fallback (`plant_disease_prediction.keras`).
- **Immediate Actionable Treatment:** Returns disease identification, confidence score, chemical treatments, organic remedies, and prevention tips.

#### 2. Water Footprint Regression Estimator
- Predicts daily irrigation requirements (in liters/day) using a serialized Random Forest / Pipeline model (`water_footprint_model.pkl`).
- Considers crop type, acreage (in acres/hectares), soil moisture retention, growth stage, and local evapotranspiration rates.

#### 3. Real-Time Government Schemes Search
- Integrated with the **Government of India Open Data Portal** (`api.data.gov.in`).
- Real-time catalog of central and state welfare initiatives: PM-KISAN, PM Fasal Bima Yojana (PMFBY), Kisan Credit Card (KCC), Sub-Mission on Agricultural Mechanization (SMAM), and solar pump subsidies.
- Dynamic filtering by category, eligibility criteria, subsidy percentage, and application links.

#### 4. Farmer Assistant & Live Weather Telemetry
- Contextual agricultural chatbot (`FarmerAssistant.py`) providing organic pest management, sowing calendar advisory, and fertilizer dosage guidance.
- Open-Meteo weather integration with temperature, relative humidity, wind speed, and agricultural spraying condition alerts.

---

### Pillar 3: CivicAI Municipal Grievance Redressal

Empowers urban citizens to report non-emergency infrastructure defects:
- **Geotagged Issue Submission:** Categories include Potholes, Broken Streetlights, Garbage Overflow, Water Pipeline Leakage, and Illegal Encroachment.
- **Community Validation:** Citizens can upvote existing issues to increase municipal priority.
- **Department Routing & SLA Tracking:** Dispatches tickets to Road Works, Sanitation, Electricity, or Water Supply departments with progress timelines.

---

## 👥 Multi-Role User Portals & Workflows

| Role | Default Dashboard | Key Capabilities |
| :--- | :--- | :--- |
| **Citizen** | `/` (Home) & `/emergency` | 1-Click SOS report, GPS pin correction, live case timeline tracking, civic complaints, helpline access |
| **Farmer** | `/dashboard/farmer` | Leaf disease image scan, water footprint calculation, government schemes explorer, agricultural assistant |
| **Dispatcher / Admin**| `/emergency/operations` | Real-time emergency queue, severity override with audit logging, nearest responder matching, system analytics |
| **Field Responder** | `/responder` | Live deployment alert, case acceptance/rejection, GPS telemetry streaming, on-scene status, resolution logging |

---

## 💻 Technology Stack

### Backend
- **Framework:** FastAPI 0.115+ (Asynchronous Python Web Framework)
- **ASGI Server:** Uvicorn (HTTP/1.1 & WebSocket support)
- **ORM & Database:** SQLAlchemy 2.0 with persistent SQLite (`emergency_sahaya.db`)
- **Machine Learning:** Scikit-Learn 1.5+, Joblib, NumPy, Pandas, Pillow, Keras/TensorFlow
- **External APIs:** Government of India Open Data (`data.gov.in`), Open-Meteo Weather API

### Frontend
- **Library:** React 19 (Modern Hooks, Context API)
- **Bundler & Dev Server:** Vite 7 (Ultra-fast HMR & Rollup production build)
- **Routing:** React Router DOM v7
- **Icons & Visuals:** Lucide React, Recharts (Data Visualizations)
- **Styling:** Modular CSS3 with responsive layouts & government portal theme

---

## 📂 Repository File & Directory Structure

```text
gen-ai-proj/
├── backend/                              # Unified Backend Services & AI Engines
│   ├── emergency/                        # Life-Critical Emergency Response Engine
│   │   ├── database.py                   # SQLite database engine, session factory & Base
│   │   ├── escalation.py                 # Automated background SLA monitor & escalation
│   │   ├── matching.py                   # Haversine distance, skill & workload responder matcher
│   │   ├── models.py                     # SQLAlchemy models (Cases, Categories, Responders, Audit)
│   │   ├── router.py                     # 35 REST endpoints & WebSocket telemetry channel
│   │   ├── seed.py                       # Initial 12 categories & 6 verified emergency responders
│   │   ├── triage.py                     # Explainable rule-based triage & priority engine
│   │   └── websocket_manager.py          # Real-time WebSocket connection manager & broadcaster
│   ├── Disease prediction Model/         # Agricultural computer vision assets
│   │   └── class_indices.json            # 38 plant disease class index mapping
│   ├── Water Footprint Model/            # Irrigation machine learning assets
│   │   └── Model/
│   │       └── water_footprint_model.pkl # Pre-trained regression pipeline
│   ├── model/crop_health/                # Fast crop disease classifier
│   │   ├── fast_model.joblib             # Serialized lightweight logistic classifier
│   │   └── classes.json                  # Classification label definitions
│   ├── static/ & templates/              # Agricultural web portal assets & Jinja2 templates
│   ├── app.py                            # Master FastAPI application mounting all modules (94 routes)
│   ├── civic_router.py                   # Municipal issue reporting & demo JWT auth
│   ├── server.py                         # Standalone uvicorn launcher script
│   ├── FarmerAssistant.py                # Agronomy chatbot with fallback intelligence
│   ├── prediction.py                     # Multi-model crop disease prediction pipeline
│   ├── schemes_data.py                   # Central & state welfare schemes dataset
│   ├── emergency_sahaya.db               # SQLite database file (auto-initialized & seeded)
│   ├── .env.example                      # Backend environment variable template
│   └── requirements.txt                  # Python package specifications
│
├── frontend/                             # React 19 Client Web Application
│   ├── src/
│   │   ├── assets/                       # Static branding images & hero artwork
│   │   ├── components/
│   │   │   ├── Emergency/                # EmergencySOSModal, EmergencyAlertsBanner, Helplines
│   │   │   ├── Layout/                   # TopBar, AppLayout, CitizenLayout, Sidebar
│   │   │   └── Shared/                   # Buttons, Badges, StatCards, Modals
│   │   ├── pages/
│   │   │   ├── Emergency/                # CitizenEmergency, DispatcherDashboard, ResponderPortal
│   │   │   ├── Farmer/                   # FarmerDashboard (Crop AI, Water footprint, Schemes)
│   │   │   ├── Login/                    # Multi-role authentication with 1-click demo access
│   │   │   ├── Dashboard/                # Citizen civic complaint overview
│   │   │   └── Analytics/                # Incident volume, SLA compliance & department charts
│   │   └── services/
│   │       ├── apiClient.js              # Standard HTTP client (configured for Port 8000)
│   │       ├── emergencyApi.js           # Emergency module REST & WebSocket client
│   │       └── api.js                    # Agricultural & Civic API integrations
│   ├── index.html                        # Application HTML document
│   ├── package.json                      # Frontend NPM dependencies & scripts
│   ├── vite.config.js                    # Vite bundler configuration
│   ├── vercel.json                       # Vercel SPA routing rewrites configuration
│   ├── .env                              # Local development environment configuration
│   └── .env.production                   # Production environment configuration (Render URL)
│
├── tests/
│   └── test_emergency_suite.py           # 15 automated integration tests for emergency lifecycle
│
├── package.json                          # Root workspace script runner
├── requirements.txt                      # Root unified Python dependencies
├── render.yaml                           # Render Cloud Blueprint for 1-click backend deployment
├── vercel.json                           # Root Vercel deployment configuration
├── start_all.bat                         # 1-Click launcher starting both servers
├── start_backend.bat                     # Dedicated backend launcher (Port 8000)
├── start_frontend.bat                    # Dedicated frontend launcher (Port 5173)
└── run_tests.bat                         # Batch script executing automated test suite
```

---

## 🔌 API Specification & Endpoints

The unified FastAPI server hosts **94 endpoints**. Key routes include:

### Emergency Response API (`/api/emergency`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/emergency/categories` | Retrieve 12 configured categories with SLAs & icons | Public |
| `POST` | `/api/emergency` | Submit new emergency case with rule triage & idempotency | Citizen |
| `GET` | `/api/emergency/user/{user_id}` | Retrieve cases reported by a specific citizen | Citizen |
| `GET` | `/api/emergency/cases` | Dispatcher query for cases with status/severity filters | Dispatcher |
| `GET` | `/api/emergency/{case_id}` | Fetch complete incident details & timeline | Authorized |
| `POST` | `/api/emergency/{case_id}/triage`| Override severity with mandatory reason | Dispatcher |
| `GET` | `/api/emergency/{case_id}/matches`| Haversine distance-ranked verified responders | Dispatcher |
| `POST` | `/api/emergency/{case_id}/assign` | Assign incident to a verified responder | Dispatcher |
| `POST` | `/api/emergency/{case_id}/accept` | Responder accepts deployment | Responder |
| `POST` | `/api/emergency/{case_id}/reject` | Responder declines deployment with reason | Responder |
| `POST` | `/api/emergency/{case_id}/status` | Validated status transition (`RESPONDING`, `ON_SCENE`)| Responder |
| `POST` | `/api/emergency/{case_id}/resolve`| Submit resolution report & mark resolved | Responder |
| `POST` | `/api/emergency/{case_id}/close`  | Finalize incident closure | Dispatcher |
| `POST` | `/api/emergency/{case_id}/reopen` | Reopen a resolved case with mandatory reason | Dispatcher |
| `GET` | `/api/emergency/{case_id}/messages`| Controlled messaging (filters internal notes) | Authorized |
| `POST` | `/api/emergency/{case_id}/messages`| Send message or internal dispatcher remark | Authorized |
| `GET` | `/api/emergency/analytics/overview`| Real SQL query metrics (response times, SLA, counts)| Dispatcher |
| `GET` | `/api/emergency/helplines` | Official national helplines directory (112, 100, 108) | Public |
| `WS` | `/api/ws/emergency/{client_id}` | Bidirectional WebSocket for real-time dispatch & GPS | Telemetry |

### Agricultural API (`/` & `/api`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/predict-disease` | Upload plant leaf image for AI disease diagnosis | Farmer |
| `POST` | `/water-footprint` | Compute crop water requirement via ML regression | Farmer |
| `GET` | `/api/schemes` | Search Government of India agricultural welfare schemes | Farmer |
| `POST` | `/api/farmer/assistant`| Submit agronomic query to AI advisory assistant | Farmer |
| `GET` | `/api/weather` | Open-Meteo live weather & spraying advisory | Public |

### Civic API (`/api`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Citizen/Farmer/Staff authentication with demo bypass | Public |
| `GET` | `/api/complaints` | Fetch geotagged municipal complaints | Public |
| `POST` | `/api/complaints` | Report municipal issue (pothole, streetlight, garbage) | Citizen |
| `POST` | `/api/complaints/{id}/upvote` | Citizen community upvote on existing complaint | Citizen |

---

## 🚀 Local Setup & Execution Guide

### Prerequisites
- **Python:** Version 3.11 or higher
- **Node.js:** Version 18 or higher (with `npm`)
- **Git**

### Method 1: 1-Click Launch (Recommended for Windows)
Double-click [`start_all.bat`](file:///c:/Users/dilli_nt0m70q/Downloads/CivicAI-master/start_all.bat) in the root directory. It automatically spawns two dedicated terminal consoles:
- **Backend API Server:** `http://localhost:8000`
- **Frontend User Interface:** `http://localhost:5173`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

### Method 2: Manual Terminal Execution

#### Terminal 1 — Backend Server
```powershell
# Navigate to repository root
cd CivicAI-master

# Create and activate Python virtual environment
python -m venv .venv
.venv\Scripts\activate          # On Linux/macOS: source .venv/bin/activate

# Install unified requirements
pip install -r requirements.txt

# Start Unified FastAPI Server
python backend/app.py
```

#### Terminal 2 — Frontend Application
```powershell
# Navigate to frontend folder
cd CivicAI-master/frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing & Quality Assurance

The platform features an automated test harness in [`tests/test_emergency_suite.py`](file:///c:/Users/dilli_nt0m70q/Downloads/CivicAI-master/tests/test_emergency_suite.py).

To run the suite:
```powershell
# Option A: Run batch script
run_tests.bat

# Option B: Run Python unittest directly
.venv\Scripts\python.exe tests/test_emergency_suite.py
```

### Verified Test Coverage (15/15 Passed):
- `test_01_categories_seeded_and_configurable`: Verifies 12 categories, SLAs, icons, and departments.
- `test_02_emergency_creation_and_atomic_reference`: Checks `EMG-YYYY-XXXXX` reference generation and rule triage.
- `test_03_duplicate_prevention`: Confirms 90-second deduplication hash blocks double clicks.
- `test_04_missing_description_validation`: Asserts HTTP 400 when emergency description is empty.
- `test_05_missing_gps_handling`: Ensures missing GPS coordinates are never replaced with fake coordinates.
- `test_06_dispatcher_triage_override`: Enforces mandatory reason when dispatchers adjust triage severity.
- `test_07_intelligent_responder_matching`: Tests Haversine distance, department match, and skill scoring.
- `test_08_unverified_responder_blocked`: Confirms unverified responders cannot receive dispatches.
- `test_09_full_lifecycle_and_audit_trail`: Verifies `CREATED → ASSIGNED → ACCEPTED → RESPONDING → ON_SCENE → RESOLVED → CLOSED`.
- `test_10_responder_rejection_and_escalation`: Confirms rejection requires reason and resets case to `UNASSIGNED`.
- `test_11_case_reopening`: Verifies reopening a closed case mandates justification.
- `test_12_controlled_messaging_internal_notes`: Validates that internal dispatcher notes are hidden from citizens.
- `test_13_emergency_analytics`: Probes SQL metrics queries for real aggregated statistics.
- `test_14_helplines_and_weather`: Confirms 112 helpline directory and weather telemetry endpoints.
- `test_15_cross_user_isolation`: Confirms citizens can only access their own private emergency files.

---

## ☁️ Cloud Deployment Architecture

The monorepo is architectured for deployment across free cloud tiers:

### 1. Backend on Render (`https://gen-ai-proj-4di6.onrender.com`)
- **Service Type:** Web Service
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python app.py` (auto-binds to `0.0.0.0:$PORT`)
- **Blueprint Config:** [`render.yaml`](file:///c:/Users/dilli_nt0m70q/Downloads/CivicAI-master/render.yaml)

### 2. Frontend on Vercel
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `vite build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_BASE_URL` = `https://gen-ai-proj-4di6.onrender.com/api`
  - `VITE_WS_BASE_URL` = `wss://gen-ai-proj-4di6.onrender.com/api/ws/emergency`
  - `VITE_CROP_DETECTION_URL` = `https://gen-ai-proj-4di6.onrender.com`
- **SPA Routing:** Configured via [`frontend/vercel.json`](file:///c:/Users/dilli_nt0m70q/Downloads/CivicAI-master/frontend/vercel.json)

---

## 🛡️ Ethics, Safety & Privacy Guardrails

1. **Internal Coordination Notice:** Submitting an emergency case through SAHAYA AI coordinates internal verified volunteers and departmental units. The UI explicitly alerts users that SAHAYA AI does **not** replace calling national emergency services (`112`).
2. **Non-Clinical AI Boundary:** The triage engine assists in prioritizing dispatches based on user-supplied details and casualty counts. It **never claims medical diagnosis** or clinical assessment.
3. **Location Privacy:** Precise coordinates are shared strictly with assigned, verified responders and authorized dispatchers.
4. **Audit Integrity:** All status transitions, triage overrides, and responder reassignments are logged immutably with actor, timestamp, and mandatory remarks.

---

## 📜 License & Acknowledgements
- **License:** Licensed under the [MIT License](LICENSE).
- **Academic Project:** Developed as a Final-Year B.Tech Capstone Project.
- **Data Acknowledgements:** Government of India Open Data (`data.gov.in`), Open-Meteo Meteorological Services.
