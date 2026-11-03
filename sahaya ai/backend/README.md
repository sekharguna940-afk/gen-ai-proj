# SAHAYA AI — Unified Backend & Emergency Response System

This backend coordinates the **SAHAYA AI Community Assistance Platform**, integrating:
1. **Emergency Response & Live Dispatch Module** (`backend/emergency/`)
2. **Civic Issue Resolution & Complaints Module** (`backend/civic_router.py`)
3. **Kisaan Saathi Farmer Portal & Crop AI** (`Kisaan-Saathi-main/app.py`)
4. **AWS Serverless Lambdas** (optional cloud deployment)

---

## 1. SAHAYA AI Emergency Response Architecture

The emergency module is an integrated FastAPI module with real-time WebSockets, rule-based triage, and geospatial responder matching.

### Lifecycle Flow
```
[Citizen SOS Panel]
       │
       ▼
    CREATED ────► (Auto-Triage / Duplicate Guard)
       │
       ▼
    TRIAGED ────► (Intelligent Responder Matching: Skills + Haversine + Workload)
       │
       ▼
   ASSIGNED ────► (WebSocket Push to Responder Device)
       │
       ▼
   ACCEPTED ────► (Field Worker Mobilization)
       │
       ▼
  RESPONDING ───► (Live Geolocation Telemetry)
       │
       ▼
   ON_SCENE ────► (Arrival Timestamp & Field Operations)
       │
       ▼
   RESOLVED ────► (Mandatory Resolution Summary & Audit)
       │
       ▼
    CLOSED  ────► (Supervisor / Dispatcher Sign-off)
```

---

## 2. Emergency Module Endpoints (`/api`)

### Emergency Case Reporting & Citizens
- `POST /api/emergency` — Submit emergency report with server-generated reference (`EMG-YYYY-XXXXX`), GPS capture, and duplicate prevention.
- `GET /api/emergency/mine` — Retrieve personal emergency cases (isolated per user phone/reporter ID).
- `GET /api/emergency/{identifier}` — Full case detail with immutable timeline, attachments, and messaging history.
- `POST /api/emergency/{case_id}/reopen` — Reopen a resolved case with mandatory reason.
- `POST /api/emergency/{case_id}/feedback` — Record citizen rating and response satisfaction.

### Dispatcher Operations Dashboard
- `GET /api/admin/emergency/queue` — Filtered live queue (Unassigned, Active, Critical, Escalated, Resolved) with auto-escalation.
- `GET /api/admin/emergency/analytics` — Real-time metrics: incident counts, avg assignment/resolution minutes, priority & category breakdowns.
- `POST /api/emergency/{case_id}/triage` — Override automated triage severity with transparent, audited reason.
- `GET /api/emergency/{case_id}/eligible-responders` — Intelligent matching engine ranking verified responders.
- `POST /api/emergency/{case_id}/assign` — Dispatch case to verified responder with workload update.
- `POST /api/emergency/{case_id}/close` — Close verified emergency with dispatcher sign-off.
- `GET /api/emergency/categories` — List active emergency categories with SLAs and departments.
- `PUT /api/admin/emergency/categories/{cat_id}` — Update category SLAs and response policies.

### Responder / Field Worker Portal
- `GET /api/responders/assignments` — Retrieve assigned cases for logged-in responder.
- `POST /api/emergency/{case_id}/accept` — Accept emergency deployment.
- `POST /api/emergency/{case_id}/reject` — Reject deployment with mandatory operational reason.
- `POST /api/emergency/{case_id}/status` — Progress lifecycle (`RESPONDING`, `ON_SCENE`).
- `POST /api/emergency/{case_id}/resolve` — Mark incident resolved with mandatory summary.
- `POST /api/responders/availability` — Toggle responder status (`AVAILABLE`, `BUSY`, `OFFLINE`).
- `POST /api/responders/location` — Stream responder GPS telemetry for live map dispatch.

### Evidence & Controlled Messaging
- `POST /api/emergency/{case_id}/attachments` — Upload photographs/videos (up to 15MB, MIME validated).
- `GET /api/emergency/{case_id}/attachments/{filename}` — Serve incident evidence files.
- `GET /api/emergency/{case_id}/messages` — Case messaging (internal dispatcher notes strictly shielded from citizens).
- `POST /api/emergency/{case_id}/messages` — Send public update or internal note.

### Public Safety, Helplines & AI Advisory
- `GET /api/emergency/helplines` — Verified Government of India emergency directory (112, 100, 101, 108, 1077, 1091, 1098).
- `GET /api/emergency/alerts/weather` — Real-time Open-Meteo satellite feed with disaster warnings.
- `GET /api/emergency/facilities/nearby` — Nearby municipal hospitals, fire stations, and police stations with Haversine distance.
- `POST /api/emergency/ai/assist` — Transparent, non-clinical AI categorization and first-aid advisory.
- `WS /api/ws/emergency/{client_id}` — Bidirectional WebSocket transport for real-time dispatch updates.

---

## 3. Seeded Verified Responders (Pune Region)

| Responder ID | Name | Role | Department | Skills |
|--------------|------|------|------------|--------|
| `RSP-001` | Dr. Ananya Sharma | Emergency Trauma Lead | EMS & Trauma Response | CPR, Advanced Trauma Life Support, Triage |
| `RSP-002` | Vikram Shinde | Fire & Rescue Captain | Fire & Rescue Department | Hazmat, Heavy Rescue, Structural Fire |
| `RSP-003` | Rajesh Deshmukh | Electrical Safety Specialist | Electricity Board (MSEDCL) | High-Voltage Isolation, Grid Repair |
| `RSP-004` | Inspector Meera Joshi | Quick Response Commander | Police QRT & Traffic Command | Crowd Management, Law Enforcement |
| `RSP-005` | Amit Kulkarni | Disaster Relief Specialist | Disaster Management Authority | Flood Rescue, Boat Operations, Evacuation |
| `RSP-006` | Dr. Priya Nair | Veterinary Medical Officer | Animal Control & Vet Services | Veterinary First Aid, Animal Rescue |

---

## 4. Running the System

### Start the Unified Backend:
```powershell
# From project root:
& ".venv\Scripts\python.exe" "Kisaan-Saathi-main\Kisaan-Saathi-main\app.py"
```
Server starts on `http://localhost:8000` with:
- Swagger Docs: `http://localhost:8000/docs`
- Kisaan Saathi: `http://localhost:8000/`
- SAHAYA AI Emergency API: `http://localhost:8000/api/emergency/...`

### Start the React Frontend:
```powershell
cd "sahaya ai"
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 5. Running Integration Tests

Run the complete 15-test emergency integration suite:
```powershell
& ".venv\Scripts\python.exe" tests\test_emergency_suite.py
```
Outputs: `Ran 15 tests in <1s ... OK`
