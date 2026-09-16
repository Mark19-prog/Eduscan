"""Integration tests for EduScan Grading Management API."""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
TEST_DIR = tempfile.TemporaryDirectory(prefix="eduscan-grading-test-")
database_path = Path(TEST_DIR.name) / "grading_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"
os.environ["EDUSCAN_DATA_DIR"] = TEST_DIR.name
os.environ["EDUSCAN_SECRET_KEY"] = "grading-test-secret-key-2026"
os.environ["SMS_GATEWAY_ENABLED"] = "false"
os.environ["ATTENDANCE_SCHEDULER_ENABLED"] = "false"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


class GradingApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client_context = TestClient(app)
        cls.client = cls.client_context.__enter__()
        # Login admin
        resp = cls.client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200, resp.text
        cls.admin_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        # Change password to satisfy security requirement
        cls.client.post("/api/auth/change-password", headers=cls.admin_headers, json={
            "current_password": "admin123", "new_password": "Grading-Admin-Pass-2026!",
        })

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client_context.__exit__(None, None, None)
        from app.database import engine
        engine.dispose()
        TEST_DIR.cleanup()

    def test_01_grading_policies_list_seeded(self) -> None:
        resp = self.client.get("/api/grading-policies", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200, resp.text)
        policies = resp.json()
        self.assertGreaterEqual(len(policies), 4)
        names = [p["name"] for p in policies]
        self.assertTrue(any("Languages/AP/EsP" in n for n in names))
        self.assertTrue(any("Math & Science" in n for n in names))
        self.assertTrue(any("MAPEH & TLE" in n for n in names))
        self.assertTrue(any("General Secondary" in n for n in names))

    def test_02_grading_policy_crud_and_validation(self) -> None:
        # Invalid weights (not 100%)
        bad_policy = {
            "name": "Invalid Policy Test",
            "school_year": "2026-2027",
            "component_definitions": [
                {"name": "Written Work", "component_type": "Written Work", "weight": 40.0},
                {"name": "Performance Tasks", "component_type": "Performance Task", "weight": 40.0},
            ],
        }
        resp = self.client.post("/api/grading-policies", headers=self.admin_headers, json=bad_policy)
        self.assertEqual(resp.status_code, 422)

        # Valid custom policy
        good_policy = {
            "name": "SHS TVL Track Policy",
            "description": "Custom policy for Senior High School TVL track",
            "school_year": "2026-2027",
            "grade_levels": "11,12",
            "subject_category": "TVL",
            "component_definitions": [
                {"name": "Written Work", "component_type": "Written Work", "weight": 20.0},
                {"name": "Performance Tasks", "component_type": "Performance Task", "weight": 60.0},
                {"name": "Quarterly Assessment", "component_type": "Quarterly Assessment", "weight": 20.0},
            ],
            "passing_grade": 75,
            "rounding_decimal_places": 2,
            "rounding_final_decimal_places": 0,
            "rounding_method": "half_up",
        }
        resp = self.client.post("/api/grading-policies", headers=self.admin_headers, json=good_policy)
        self.assertEqual(resp.status_code, 200, resp.text)
        policy_id = resp.json()["id"]

        # Read back
        get_resp = self.client.get(f"/api/grading-policies/{policy_id}", headers=self.admin_headers)
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.json()["name"], "SHS TVL Track Policy")

        # Update
        good_policy["description"] = "Updated TVL policy description"
        good_policy["status"] = "Active"
        update_resp = self.client.put(f"/api/grading-policies/{policy_id}", headers=self.admin_headers, json=good_policy)
        self.assertEqual(update_resp.status_code, 200)

    def test_03_gradebook_lifecycle_scores_and_calculations(self) -> None:
        # 1. Fetch academic structure
        struct_resp = self.client.get("/api/admin/academic-structure", headers=self.admin_headers)
        self.assertEqual(struct_resp.status_code, 200)
        struct = struct_resp.json()
        sy = struct["school_years"][0]
        gp = struct["grading_periods"][0]
        gl = struct["grade_levels"][0]
        sec = [s for s in struct["sections"] if s["grade_level_id"] == gl["id"]][0]
        subj = struct["subjects"][0]

        # Add 2 test students in this grade/section
        s1 = self.client.post("/api/persons", headers=self.admin_headers, json={
            "external_id": "TEST-STU-001", "lrn": "111111111111", "full_name": "DELA CRUZ, JUAN",
            "sex": "Male", "role": "Student", "grade": gl["name"], "section": sec["name"],
            "guardian_phone": "+639170000001", "biometric_consent": False,
        })
        self.assertEqual(s1.status_code, 200, s1.text)
        s1_id = s1.json()["id"]

        s2 = self.client.post("/api/persons", headers=self.admin_headers, json={
            "external_id": "TEST-STU-002", "lrn": "111111111112", "full_name": "SANTOS, MARIA",
            "sex": "Female", "role": "Student", "grade": gl["name"], "section": sec["name"],
            "guardian_phone": "+639170000002", "biometric_consent": False,
        })
        self.assertEqual(s2.status_code, 200, s2.text)
        s2_id = s2.json()["id"]

        # 2. Create Gradebook
        gb_create = self.client.post("/api/gradebooks", headers=self.admin_headers, json={
            "school_year_id": sy["id"],
            "grading_period_id": gp["id"],
            "grade_level_id": gl["id"],
            "section_id": sec["id"],
            "subject_id": subj["id"],
        })
        self.assertEqual(gb_create.status_code, 200, gb_create.text)
        gb_id = gb_create.json()["id"]

        # 3. Load full gradebook
        gb_resp = self.client.get(f"/api/gradebooks/{gb_id}", headers=self.admin_headers)
        self.assertEqual(gb_resp.status_code, 200)
        gb_data = gb_resp.json()
        self.assertEqual(gb_data["gradebook"]["status"], "Draft")
        self.assertGreaterEqual(len(gb_data["components"]), 1)
        self.assertGreaterEqual(len(gb_data["students"]), 2)

        # 4. Update components to standard 3-component structure
        components_payload = [
            {
                "name": "Written Work",
                "component_type": "Written Work",
                "weight": 30.0,
                "items": [
                    {"label": "Quiz 1", "max_score": 20.0},
                    {"label": "Quiz 2", "max_score": 30.0},
                ],
            },
            {
                "name": "Performance Tasks",
                "component_type": "Performance Task",
                "weight": 50.0,
                "items": [
                    {"label": "Project 1", "max_score": 50.0},
                ],
            },
            {
                "name": "Quarterly Assessment",
                "component_type": "Quarterly Assessment",
                "weight": 20.0,
                "items": [
                    {"label": "Periodical Exam", "max_score": 50.0},
                ],
            },
        ]
        comp_update = self.client.put(f"/api/gradebooks/{gb_id}/components", headers=self.admin_headers, json={
            "components": components_payload,
            "change_reason": "Configure Q1 assessment components",
        })
        self.assertEqual(comp_update.status_code, 200, comp_update.text)

        # Reload to get generated item IDs
        gb_data = self.client.get(f"/api/gradebooks/{gb_id}", headers=self.admin_headers).json()
        items = []
        for c in gb_data["components"]:
            for item in c["items"]:
                items.append(item)
        self.assertEqual(len(items), 4)

        q1_id, q2_id, proj_id, exam_id = [item["id"] for item in items]

        # 5. Save scores for student 1 (perfect scores: 20/20, 30/30, 50/50, 50/50 -> 100 transmuted)
        scores_payload = {
            "scores": {
                str(s1_id): [
                    {"assessment_item_id": q1_id, "score": 20.0, "status": "Scored"},
                    {"assessment_item_id": q2_id, "score": 30.0, "status": "Scored"},
                    {"assessment_item_id": proj_id, "score": 50.0, "status": "Scored"},
                    {"assessment_item_id": exam_id, "score": 50.0, "status": "Scored"},
                ],
                str(s2_id): [
                    # Student 2 is partially entered (missing exam)
                    {"assessment_item_id": q1_id, "score": 15.0, "status": "Scored"},
                    {"assessment_item_id": q2_id, "score": 20.0, "status": "Scored"},
                    {"assessment_item_id": proj_id, "score": 40.0, "status": "Scored"},
                    {"assessment_item_id": exam_id, "score": None, "status": "Missing"},
                ],
            },
            "change_reason": "Enter first batch of scores",
        }
        score_resp = self.client.put(f"/api/gradebooks/{gb_id}/scores", headers=self.admin_headers, json=scores_payload)
        self.assertEqual(score_resp.status_code, 200, score_resp.text)

        # 6. Verify calculations
        gb_data = self.client.get(f"/api/gradebooks/{gb_id}", headers=self.admin_headers).json()
        s1_row = next(s for s in gb_data["students"] if s["person_id"] == s1_id)
        self.assertEqual(s1_row["initial_grade"], 100.0)
        self.assertEqual(s1_row["reported_grade"], 100)
        self.assertEqual(s1_row["status"], "Passing")
        self.assertTrue(s1_row["complete"])

        s2_row = next(s for s in gb_data["students"] if s["person_id"] == s2_id)
        self.assertIsNone(s2_row["reported_grade"])
        self.assertEqual(s2_row["status"], "Incomplete")
        self.assertFalse(s2_row["complete"])

        # 7. Check calculation breakdown modal data
        calc_resp = self.client.get(f"/api/gradebooks/{gb_id}/calculation/{s1_id}", headers=self.admin_headers)
        self.assertEqual(calc_resp.status_code, 200)
        calc_data = calc_resp.json()
        self.assertEqual(calc_data["student_name"], "DELA CRUZ, JUAN")
        self.assertEqual(len(calc_data["components"]), 3)
        self.assertEqual(calc_data["reported_grade"], 100)

        # 8. Workflow: Submit
        sub_resp = self.client.post(f"/api/gradebooks/{gb_id}/submit", headers=self.admin_headers, json={
            "reason": "Ready for quarterly review",
        })
        self.assertEqual(sub_resp.status_code, 200)
        self.assertEqual(sub_resp.json()["status"], "Submitted")

        # 9. Finalize should fail because student 2 is incomplete
        fin_fail = self.client.post(f"/api/gradebooks/{gb_id}/finalize", headers=self.admin_headers, json={
            "reason": "Finalizing Q1 gradebook",
        })
        self.assertEqual(fin_fail.status_code, 409)
        self.assertIn("incomplete", fin_fail.text)

        # Complete student 2's score
        self.client.put(f"/api/gradebooks/{gb_id}/scores", headers=self.admin_headers, json={
            "scores": {
                str(s2_id): [
                    {"assessment_item_id": exam_id, "score": 35.0, "status": "Scored"},
                ],
            },
            "change_reason": "Enter missing exam for Student 2",
        })

        # 10. Finalize should now succeed
        fin_ok = self.client.post(f"/api/gradebooks/{gb_id}/finalize", headers=self.admin_headers, json={
            "reason": "All scores entered and verified",
        })
        self.assertEqual(fin_ok.status_code, 200)
        self.assertEqual(fin_ok.json()["status"], "Finalized")

        # Editing scores while finalized must fail
        edit_blocked = self.client.put(f"/api/gradebooks/{gb_id}/scores", headers=self.admin_headers, json={
            "scores": {str(s1_id): [{"assessment_item_id": q1_id, "score": 10.0, "status": "Scored"}]},
            "change_reason": "Unauthorized modification",
        })
        self.assertEqual(edit_blocked.status_code, 422)

        # 11. Lock gradebook
        lock_resp = self.client.post(f"/api/gradebooks/{gb_id}/lock", headers=self.admin_headers, json={
            "reason": "Quarter grades archived",
        })
        self.assertEqual(lock_resp.status_code, 200)
        self.assertEqual(lock_resp.json()["status"], "Locked")

        # 12. Reopen with reason
        reopen_resp = self.client.post(f"/api/gradebooks/{gb_id}/reopen", headers=self.admin_headers, json={
            "reason": "Correcting student score following parent conference",
        })
        self.assertEqual(reopen_resp.status_code, 200)
        self.assertEqual(reopen_resp.json()["status"], "Draft")

        # 13. Check audit history
        audit_resp = self.client.get(f"/api/gradebooks/{gb_id}/audit", headers=self.admin_headers)
        self.assertEqual(audit_resp.status_code, 200)
        audit_list = audit_resp.json()
        self.assertGreaterEqual(len(audit_list), 5)
        actions = [a["action"] for a in audit_list]
        self.assertIn("Create", actions)
        self.assertIn("Submit", actions)
        self.assertIn("Finalize", actions)
        self.assertIn("Lock", actions)
        self.assertIn("Reopen", actions)

    def test_04_grade_adjustment_request_flow(self) -> None:
        struct = self.client.get("/api/admin/academic-structure", headers=self.admin_headers).json()
        sy = struct["school_years"][0]
        gp = struct["grading_periods"][1] if len(struct["grading_periods"]) > 1 else struct["grading_periods"][0]
        gl = struct["grade_levels"][0]
        sec = [s for s in struct["sections"] if s["grade_level_id"] == gl["id"]][0]
        subj = struct["subjects"][1] if len(struct["subjects"]) > 1 else struct["subjects"][0]

        # Create gradebook
        gb_create = self.client.post("/api/gradebooks", headers=self.admin_headers, json={
            "school_year_id": sy["id"], "grading_period_id": gp["id"],
            "grade_level_id": gl["id"], "section_id": sec["id"], "subject_id": subj["id"],
        })
        gb_id = gb_create.json()["id"]
        gb_data = self.client.get(f"/api/gradebooks/{gb_id}", headers=self.admin_headers).json()
        item_id = gb_data["components"][0]["items"][0]["id"]
        student_id = gb_data["students"][0]["person_id"]

        # Enter score
        self.client.put(f"/api/gradebooks/{gb_id}/scores", headers=self.admin_headers, json={
            "scores": {str(student_id): [{"assessment_item_id": item_id, "score": 15.0, "status": "Scored"}]},
            "change_reason": "Initial score entry",
        })

        # Request adjustment
        adj_resp = self.client.post(f"/api/gradebooks/{gb_id}/adjustments", headers=self.admin_headers, json={
            "person_id": student_id,
            "assessment_item_id": item_id,
            "new_score": 18.0,
            "new_status": "Scored",
            "reason": "Teacher re-checked essay rubric and awarded +3 points",
        })
        self.assertEqual(adj_resp.status_code, 200)
        adj_id = adj_resp.json()["id"]

        # List adjustments
        list_adj = self.client.get(f"/api/gradebooks/{gb_id}/adjustments", headers=self.admin_headers)
        self.assertEqual(list_adj.status_code, 200)
        self.assertEqual(len(list_adj.json()), 1)
        self.assertEqual(list_adj.json()[0]["status"], "Pending")

        # Approve adjustment
        app_resp = self.client.put(f"/api/adjustment-requests/{adj_id}", headers=self.admin_headers, json={
            "status": "Approved",
            "note": "Approved per submitted revised rubric",
        })
        self.assertEqual(app_resp.status_code, 200)
        self.assertEqual(app_resp.json()["status"], "Approved")

        # Verify score is now 18.0
        gb_after = self.client.get(f"/api/gradebooks/{gb_id}", headers=self.admin_headers).json()
        student_after = next(s for s in gb_after["students"] if s["person_id"] == student_id)
        self.assertEqual(student_after["scores"][str(item_id)], 18.0)


if __name__ == "__main__":
    unittest.main()
