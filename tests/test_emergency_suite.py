"""
SAHAYA AI Emergency Module — Integration Test Suite
====================================================
Uses httpx.AsyncClient + ASGITransport against a minimal FastAPI app that
contains only the emergency router.  This avoids the full Kisaan-Saathi app
startup (which loads ML models that block indefinitely inside TestClient).

Run from project root:
    python tests\test_emergency_suite.py

Requirements (all present in .venv): httpx, anyio, fastapi, sqlalchemy
"""

import os
import sys
import asyncio
import unittest
from pathlib import Path

# ─── Path setup ───────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "sahaya ai" / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Use isolated test database (must be set BEFORE importing emergency modules)
TEST_DB = str(BACKEND_DIR / "test_emergency.db")
os.environ["EMERGENCY_DB_PATH"] = TEST_DB
os.environ["MOCK_WEATHER_ALERTS"] = "true"

# Clean previous run artefacts
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)

# ─── Emergency module imports ──────────────────────────────────────────────────
from emergency.database import SessionLocal
from emergency.seed import init_db_and_seed
from emergency.models import (
    EmergencyCase, EmergencyCategory, EmergencyHistory,
    Responder, EmergencyAssignment, EmergencyMessage
)

# ─── Build minimal test app ────────────────────────────────────────────────────
from fastapi import FastAPI
from emergency.router import router as emergency_router

test_app = FastAPI(title="Sahaya-Test")
test_app.include_router(emergency_router)

# ─── Async HTTP helpers ────────────────────────────────────────────────────────
import httpx
from httpx import AsyncClient, ASGITransport

BASE = "http://test"


def run(coro):
    """Run an async coroutine synchronously (Python 3.10+)."""
    return asyncio.get_event_loop().run_until_complete(coro)


async def client():
    return AsyncClient(transport=ASGITransport(app=test_app), base_url=BASE)


# ─── Shared state ─────────────────────────────────────────────────────────────
# Populated during lifecycle test so later tests can reuse
_lifecycle_case_id = None


# ═════════════════════════════════════════════════════════════════════════════
class SahayaEmergencyTestSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Seed the isolated test database once before all tests."""
        init_db_and_seed()
        print("\n[SAHAYA AI Tests] Database seeded successfully.\n")

    # ─── 01 — Categories ──────────────────────────────────────────────────────
    def test_01_categories_seeded_and_configurable(self):
        """Verify 12 official categories are seeded with routing departments and SLAs."""

        async def _run():
            async with await client() as c:
                r = await c.get("/api/emergency/categories")
                self.assertEqual(r.status_code, 200)
                data = r.json()
                self.assertTrue(data["success"])
                cat_ids = [x["id"] for x in data["categories"]]
                for expected in [
                    "medical", "road_accident", "fire", "flood", "natural_disaster",
                    "public_safety", "missing_person", "infrastructure_hazard",
                    "electrical_hazard", "agricultural_emergency", "animal_related", "other"
                ]:
                    self.assertIn(expected, cat_ids,
                                  f"Missing category: {expected}")
                self.assertGreaterEqual(len(data["categories"]), 12)

        run(_run())

    # ─── 02 — Emergency creation & atomic reference ────────────────────────────
    def test_02_emergency_creation_and_atomic_reference(self):
        """Verify emergency creation, EMG-YYYY-XXXXX reference, and rule-based triage."""

        async def _run():
            async with await client() as c:
                r = await c.post("/api/emergency", json={
                    "category_id": "medical",
                    "description": "Victim unconscious following collapse, heavy breathing.",
                    "reporter_name": "Sanjay Rao",
                    "reporter_phone": "+919822114477",
                    "latitude": 18.5204,
                    "longitude": 73.8567,
                    "address": "Deccan Gymkhana, Pune",
                    "immediate_hazards": ["unconscious"],
                    "affected_count": 1
                })
                self.assertEqual(r.status_code, 200, r.text)
                data = r.json()
                self.assertTrue(data["success"])
                self.assertTrue(data["reference_no"].startswith("EMG-"),
                                f"Bad ref: {data['reference_no']}")
                self.assertEqual(data["status"], "CREATED")
                self.assertEqual(data["severity"], "CRITICAL")
                self.assertFalse(data["responder_assigned"])
                self.assertIn("unconscious", data["triage_reason"].lower())

        run(_run())

    # ─── 03 — Duplicate prevention ────────────────────────────────────────────
    def test_03_duplicate_prevention(self):
        """Verify duplicate submission is detected via idempotency key."""

        async def _run():
            async with await client() as c:
                payload = {
                    "category_id": "fire",
                    "description": "Small electrical spark near building meter.",
                    "reporter_name": "Sunil Shinde",
                    "reporter_phone": "+919822339900",
                    "idempotency_key": "idemp_test_key_dup_001"
                }
                r1 = await c.post("/api/emergency", json=payload)
                r2 = await c.post("/api/emergency", json=payload)
                self.assertEqual(r1.status_code, 200, r1.text)
                self.assertEqual(r2.status_code, 200, r2.text)

                d1, d2 = r1.json(), r2.json()
                self.assertEqual(d1["case_id"], d2["case_id"],
                                 "Duplicate submission must return same case ID")
                self.assertIn("Duplicate submission detected", d2.get("message", ""))

        run(_run())

    # ─── 04 — Missing description validation ──────────────────────────────────
    def test_04_missing_description_validation(self):
        """Verify 400 when description is blank."""

        async def _run():
            async with await client() as c:
                r = await c.post("/api/emergency", json={
                    "category_id": "medical",
                    "description": "",
                    "reporter_phone": "+919822339900"
                })
                self.assertEqual(r.status_code, 400, r.text)

        run(_run())

    # ─── 05 — Missing GPS falls back gracefully ───────────────────────────────
    def test_05_missing_gps_handling(self):
        """Verify null GPS is NOT replaced with invented coordinates."""

        async def _run():
            async with await client() as c:
                r = await c.post("/api/emergency", json={
                    "category_id": "other",
                    "description": "Water logging outside residential society gate.",
                    "reporter_phone": "+919822557711",
                    "address": "Baner Road, Near Bitwise, Pune"
                })
                self.assertEqual(r.status_code, 200, r.text)
                data = r.json()
                self.assertTrue(data["success"])
                loc = data["reported_location"]
                self.assertIsNone(loc["latitude"],
                                  "latitude must be null when not provided")
                self.assertIsNone(loc["longitude"],
                                  "longitude must be null when not provided")
                self.assertEqual(loc["address"], "Baner Road, Near Bitwise, Pune")

        run(_run())

    # ─── 06 — Dispatcher triage override ──────────────────────────────────────
    def test_06_dispatcher_triage_override(self):
        """Verify dispatcher severity override requires a non-blank reason."""

        async def _run():
            async with await client() as c:
                # Create case
                cr = await c.post("/api/emergency", json={
                    "category_id": "infrastructure_hazard",
                    "description": "Sidewalk stone loose.",
                    "reporter_phone": "+919822001122"
                })
                self.assertEqual(cr.status_code, 200, cr.text)
                case_id = cr.json()["case_id"]

                # Override without reason → 400
                bad = await c.post(f"/api/emergency/{case_id}/triage", json={
                    "severity": "CRITICAL",
                    "reason": ""
                })
                self.assertEqual(bad.status_code, 400, bad.text)

                # Override with valid reason → 200
                good = await c.post(f"/api/emergency/{case_id}/triage", json={
                    "severity": "CRITICAL",
                    "reason": "Exposed high-voltage conduit detected underneath loose stone.",
                    "dispatcher_name": "Dispatcher Deshmukh"
                })
                self.assertEqual(good.status_code, 200, good.text)
                gd = good.json()
                self.assertTrue(gd["success"])
                self.assertEqual(gd["case"]["severity"], "CRITICAL")
                self.assertTrue(gd["case"]["triage_overridden"])

        run(_run())

    # ─── 07 — Intelligent responder matching ──────────────────────────────────
    def test_07_intelligent_responder_matching(self):
        """Verify matching engine returns verified, skill-relevant responders."""

        async def _run():
            async with await client() as c:
                # Create fire case near Pune
                cr = await c.post("/api/emergency", json={
                    "category_id": "fire",
                    "description": "Active fire in industrial shed with chemical drums.",
                    "reporter_phone": "+919822002233",
                    "latitude": 18.5204,
                    "longitude": 73.8567
                })
                self.assertEqual(cr.status_code, 200, cr.text)
                case_id = cr.json()["case_id"]

                mr = await c.get(f"/api/emergency/{case_id}/eligible-responders")
                self.assertEqual(mr.status_code, 200, mr.text)
                md = mr.json()
                self.assertTrue(md["success"])
                self.assertGreater(md["total"], 0,
                                   "At least one eligible responder expected for fire case")
                top = md["eligible"][0]
                self.assertGreaterEqual(top["matching_score"], 50,
                                        "Top responder score must meet minimum threshold")
                self.assertIsNotNone(top["distance_km"])

        run(_run())

    # ─── 08 — Unverified responder blocked ────────────────────────────────────
    def test_08_unverified_responder_blocked(self):
        """Verify PENDING responders cannot receive assignments."""

        async def _run():
            async with await client() as c:
                # Create unverified responder
                rr = await c.post("/api/admin/responders", json={
                    "name": "Trainee Volunteer",
                    "phone": "+919800000001",
                    "role": "Trainee",
                    "department": "Volunteer Corp",
                    "verification_status": "PENDING",
                    "availability_status": "AVAILABLE"
                })
                self.assertEqual(rr.status_code, 200, rr.text)
                resp_id = rr.json()["responder"]["responder_id"]

                cr = await c.post("/api/emergency", json={
                    "category_id": "medical",
                    "description": "Minor fall, patient conscious.",
                    "reporter_phone": "+919822003344"
                })
                self.assertEqual(cr.status_code, 200, cr.text)
                case_id = cr.json()["case_id"]

                ar = await c.post(f"/api/emergency/{case_id}/assign", json={
                    "responder_id": resp_id,
                    "dispatcher_name": "Dispatcher"
                })
                self.assertEqual(ar.status_code, 400, ar.text)
                self.assertIn("unverified", ar.json()["detail"].lower())

        run(_run())

    # ─── 09 — Full lifecycle + audit trail ────────────────────────────────────
    def test_09_full_lifecycle_and_audit_trail(self):
        """CREATED→ASSIGNED→ACCEPTED→RESPONDING→ON_SCENE→RESOLVED→CLOSED + immutable history."""
        global _lifecycle_case_id

        async def _run():
            global _lifecycle_case_id
            async with await client() as c:
                # 1. Create
                cr = await c.post("/api/emergency", json={
                    "category_id": "road_accident",
                    "description": "Bike skid on highway, minor knee abrasion, victim conscious.",
                    "reporter_name": "Pooja Patil",
                    "reporter_phone": "+919822004455",
                    "latitude": 18.5204,
                    "longitude": 73.8567
                })
                self.assertEqual(cr.status_code, 200, cr.text)
                case_id = cr.json()["case_id"]
                _lifecycle_case_id = case_id

                # 2. Assign verified RSP-001
                ar = await c.post(f"/api/emergency/{case_id}/assign", json={
                    "responder_id": "RSP-001",
                    "dispatcher_name": "Duty Officer"
                })
                self.assertEqual(ar.status_code, 200, ar.text)
                self.assertEqual(ar.json()["case"]["status"], "ASSIGNED")

                # 3. Accept
                acc = await c.post(f"/api/emergency/{case_id}/accept", json={
                    "responder_id": "RSP-001",
                    "responder_name": "Dr. Ananya Sharma"
                })
                self.assertEqual(acc.status_code, 200, acc.text)
                self.assertEqual(acc.json()["status"], "ACCEPTED")

                # 4. Invalid transition: ACCEPTED → RESOLVED (must fail)
                bad = await c.post(f"/api/emergency/{case_id}/status", json={
                    "status": "RESOLVED"
                })
                self.assertEqual(bad.status_code, 400, "ACCEPTED→RESOLVED must be rejected")

                # 5. ACCEPTED → RESPONDING
                resp = await c.post(f"/api/emergency/{case_id}/status", json={
                    "status": "RESPONDING"
                })
                self.assertEqual(resp.status_code, 200, resp.text)
                self.assertEqual(resp.json()["status"], "RESPONDING")

                # 6. RESPONDING → ON_SCENE
                scene = await c.post(f"/api/emergency/{case_id}/status", json={
                    "status": "ON_SCENE"
                })
                self.assertEqual(scene.status_code, 200, scene.text)
                self.assertEqual(scene.json()["status"], "ON_SCENE")

                # 7. Resolve with mandatory summary
                res = await c.post(f"/api/emergency/{case_id}/resolve", json={
                    "resolution_summary": "First aid applied, abrasion cleaned, patient discharged safely."
                })
                self.assertEqual(res.status_code, 200, res.text)
                self.assertEqual(res.json()["status"], "RESOLVED")

                # 8. Close
                close = await c.post(f"/api/emergency/{case_id}/close", json={
                    "remarks": "Resolution verified and signed off by Operations Command."
                })
                self.assertEqual(close.status_code, 200, close.text)
                self.assertEqual(close.json()["status"], "CLOSED")

                # 9. Verify audit trail
                detail = await c.get(f"/api/emergency/{case_id}")
                self.assertEqual(detail.status_code, 200, detail.text)
                statuses = [h["new_status"] for h in detail.json()["timeline"]]
                self.assertEqual(
                    statuses,
                    ["CREATED", "ASSIGNED", "ACCEPTED", "RESPONDING", "ON_SCENE", "RESOLVED", "CLOSED"],
                    f"Audit trail mismatch: {statuses}"
                )

        run(_run())

    # ─── 10 — Responder rejection & escalation ────────────────────────────────
    def test_10_responder_rejection_and_escalation(self):
        """Verify rejection without reason fails; with reason case → UNASSIGNED."""

        async def _run():
            async with await client() as c:
                cr = await c.post("/api/emergency", json={
                    "category_id": "electrical_hazard",
                    "description": "Fallen live wire on metal fence, sparking.",
                    "reporter_phone": "+919822005566"
                })
                self.assertEqual(cr.status_code, 200, cr.text)
                case_id = cr.json()["case_id"]

                # Assign RSP-003 (electrical specialist)
                ar = await c.post(f"/api/emergency/{case_id}/assign", json={
                    "responder_id": "RSP-003"
                })
                self.assertEqual(ar.status_code, 200, ar.text)

                # Reject without reason → 400
                bad = await c.post(f"/api/emergency/{case_id}/reject", json={
                    "reason": ""
                })
                self.assertEqual(bad.status_code, 400, bad.text)

                # Reject with reason → UNASSIGNED
                rej = await c.post(f"/api/emergency/{case_id}/reject", json={
                    "responder_id": "RSP-003",
                    "responder_name": "Rajesh Deshmukh",
                    "reason": "Vehicle electrical failure on highway, cannot reach site."
                })
                self.assertEqual(rej.status_code, 200, rej.text)
                self.assertEqual(rej.json()["status"], "UNASSIGNED")

        run(_run())

    # ─── 11 — Case reopening ──────────────────────────────────────────────────
    def test_11_case_reopening(self):
        """Verify reopening a RESOLVED case requires a reason; no-reason → 400."""

        async def _run():
            async with await client() as c:
                cr = await c.post("/api/emergency", json={
                    "category_id": "animal_related",
                    "description": "Trapped stray puppy in drainage gutter, whining.",
                    "reporter_phone": "+919822006677"
                })
                case_id = cr.json()["case_id"]

                # Quick lifecycle to RESOLVED
                await c.post(f"/api/emergency/{case_id}/assign",
                             json={"responder_id": "RSP-006"})
                await c.post(f"/api/emergency/{case_id}/accept", json={})
                await c.post(f"/api/emergency/{case_id}/status",
                             json={"status": "RESPONDING"})
                await c.post(f"/api/emergency/{case_id}/status",
                             json={"status": "ON_SCENE"})
                await c.post(f"/api/emergency/{case_id}/resolve",
                             json={"resolution_summary": "Puppy safely extracted."})

                # Reopen without reason → 400
                bad = await c.post(f"/api/emergency/{case_id}/reopen",
                                   json={"reason": ""})
                self.assertEqual(bad.status_code, 400, bad.text)

                # Reopen with reason → REOPENED
                good = await c.post(f"/api/emergency/{case_id}/reopen", json={
                    "reason": "Second animal spotted trapped further inside pipe."
                })
                self.assertEqual(good.status_code, 200, good.text)
                self.assertEqual(good.json()["status"], "REOPENED")

        run(_run())

    # ─── 12 — Controlled messaging (internal notes shielded) ──────────────────
    def test_12_controlled_messaging_internal_notes(self):
        """Internal dispatcher notes must not appear in citizen message view."""

        async def _run():
            async with await client() as c:
                cr = await c.post("/api/emergency", json={
                    "category_id": "public_safety",
                    "description": "Large crowd gathering near busy intersection, no police.",
                    "reporter_phone": "+919822007788"
                })
                case_id = cr.json()["case_id"]

                # Internal dispatcher note
                await c.post(f"/api/emergency/{case_id}/messages", json={
                    "message": "Police patrol unit PCR-7 alerted on frequency 442.1.",
                    "sender_role": "dispatcher",
                    "is_internal": True
                })

                # Public update
                await c.post(f"/api/emergency/{case_id}/messages", json={
                    "message": "Community response unit is en route.",
                    "sender_role": "dispatcher",
                    "is_internal": False
                })

                # Citizen view: only 1 public message
                cit = await c.get(f"/api/emergency/{case_id}/messages?role=citizen")
                self.assertEqual(cit.status_code, 200, cit.text)
                cit_msgs = cit.json()["messages"]
                self.assertEqual(len(cit_msgs), 1,
                                 "Citizen must see only public messages")
                self.assertFalse(cit_msgs[0]["is_internal"])

                # Dispatcher view: sees both
                disp = await c.get(f"/api/emergency/{case_id}/messages?role=dispatcher")
                self.assertEqual(disp.status_code, 200, disp.text)
                disp_msgs = disp.json()["messages"]
                self.assertEqual(len(disp_msgs), 2,
                                 "Dispatcher must see all messages including internal")

        run(_run())

    # ─── 13 — Emergency analytics ─────────────────────────────────────────────
    def test_13_emergency_analytics(self):
        """Analytics must use real DB queries (no fabricated numbers)."""

        async def _run():
            async with await client() as c:
                r = await c.get("/api/admin/emergency/analytics")
                self.assertEqual(r.status_code, 200, r.text)
                metrics = r.json()["metrics"]
                self.assertGreater(metrics["total_incidents"], 0,
                                   "Total incidents must be > 0 after test run")
                self.assertGreaterEqual(metrics["active_incidents"], 0)
                self.assertIsInstance(metrics["categories_breakdown"], list)
                self.assertIsInstance(metrics["priority_breakdown"], list)

        run(_run())

    # ─── 14 — Helplines & weather alerts ─────────────────────────────────────
    def test_14_helplines_and_weather(self):
        """Verify helplines directory returns 112 as primary; weather endpoint responds."""

        async def _run():
            async with await client() as c:
                hl = await c.get("/api/emergency/helplines")
                self.assertEqual(hl.status_code, 200, hl.text)
                hd = hl.json()
                self.assertEqual(hd["national_emergency"], "112",
                                 "National emergency number must be 112")
                self.assertGreaterEqual(len(hd["helplines"]), 5)

                # MOCK_WEATHER_ALERTS=true → immediate mock response
                w = await c.get("/api/emergency/alerts/weather")
                self.assertEqual(w.status_code, 200, w.text)
                wd = w.json()
                self.assertTrue(wd["success"])
                self.assertIn("has_active_alerts", wd)

        run(_run())

    # ─── 15 — Cross-user isolation ────────────────────────────────────────────
    def test_15_cross_user_isolation(self):
        """Citizens must only see their own cases."""

        async def _run():
            async with await client() as c:
                r = await c.get("/api/emergency/mine?phone=%2B919822114477")
                self.assertEqual(r.status_code, 200, r.text)
                data = r.json()
                self.assertTrue(data["success"])
                mine = data["cases"]
                self.assertGreaterEqual(len(mine), 1,
                                        "Must find at least one case for this reporter")
                for case in mine:
                    phone = case.get("reporter_phone", "")
                    self.assertIn("9822114477", phone,
                                  f"Case belongs to another user: {phone}")

        run(_run())


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    loader = unittest.TestLoader()
    loader.sortTestMethodsUsing = None  # preserve declaration order
    suite = loader.loadTestsFromTestCase(SahayaEmergencyTestSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
