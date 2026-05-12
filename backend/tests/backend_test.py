"""Backend tests for College Complaint Management System (incl. AI triage)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://complaint-hub-144.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@gmail.com", "password": "Admin@123"}
STAFF = {"email": "staff@gmail.com", "password": "Staff@123"}
STUDENT = {"email": "student@gmail.com", "password": "Student@123"}

AI_WAIT_MAX = 25  # seconds
AI_POLL_INTERVAL = 2


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


def _wait_for_ai(staff_h, cid, max_wait=AI_WAIT_MAX):
    """Poll list endpoint until ai_status != 'pending' or timeout."""
    deadline = time.time() + max_wait
    last = None
    while time.time() < deadline:
        r = requests.get(f"{API}/complaints", headers=staff_h, timeout=20)
        if r.status_code == 200:
            for c in r.json():
                if c["id"] == cid:
                    last = c
                    if c.get("ai_status") in ("done", "failed"):
                        return c
                    break
        time.sleep(AI_POLL_INTERVAL)
    return last


@pytest.fixture(scope="session")
def admin_auth():
    token, user = _login(ADMIN)
    return {"token": token, "user": user, "h": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def staff_auth():
    token, user = _login(STAFF)
    return {"token": token, "user": user, "h": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="session")
def student_auth():
    token, user = _login(STUDENT)
    return {"token": token, "user": user, "h": {"Authorization": f"Bearer {token}"}}


# --- Auth (regression) ---
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=20)
        assert r.status_code == 200

    def test_login_admin(self, admin_auth):
        assert admin_auth["user"]["role"] == "admin"

    def test_login_staff(self, staff_auth):
        assert staff_auth["user"]["role"] == "staff"

    def test_login_student(self, student_auth):
        assert student_auth["user"]["role"] == "student"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@gmail.com", "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me(self, admin_auth):
        r = requests.get(f"{API}/auth/me", headers=admin_auth["h"], timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@gmail.com"

    def test_register_new_student(self):
        email = f"TEST_stu_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"name": "Test Stu", "email": email, "password": "Pass@123", "role": "student"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "student"


# --- Complaints regression ---
class TestComplaintsRegression:
    @pytest.fixture(scope="class")
    def created(self, student_auth):
        payload = {"title": "TEST_RegrComplaint", "description": "Generic regression complaint body", "category": "IT"}
        r = requests.post(f"{API}/complaints", json=payload, headers=student_auth["h"], timeout=20)
        assert r.status_code == 200, r.text
        return r.json()

    def test_initial_state(self, created):
        # New AI fields on create response
        assert created["status"] == "Pending"
        assert created["priority"] == "Unrated"
        assert created["urgency_score"] == 0
        assert created["ai_status"] == "pending"
        assert created["ai_tags"] == []

    def test_student_lists_own_only(self, student_auth, created):
        r = requests.get(f"{API}/complaints", headers=student_auth["h"], timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert all(c["user_email"] == "student@gmail.com" for c in items)
        assert any(c["id"] == created["id"] for c in items)

    def test_staff_lists_all(self, staff_auth, created):
        r = requests.get(f"{API}/complaints", headers=staff_auth["h"], timeout=20)
        assert r.status_code == 200
        assert any(c["id"] == created["id"] for c in r.json())

    def test_staff_can_update_status(self, staff_auth, created):
        r = requests.patch(f"{API}/complaints/{created['id']}/status",
                           json={"status": "In Progress", "response": "Looking into it"},
                           headers=staff_auth["h"], timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "In Progress"
        # AI fields preserved/defaulted on update
        assert "priority" in d and "urgency_score" in d

    def test_admin_can_delete(self, admin_auth, created):
        r = requests.delete(f"{API}/complaints/{created['id']}", headers=admin_auth["h"], timeout=20)
        assert r.status_code == 200


# --- Users regression ---
class TestUsersRegression:
    def test_list_users_admin(self, admin_auth):
        r = requests.get(f"{API}/users", headers=admin_auth["h"], timeout=20)
        assert r.status_code == 200
        assert any(u["email"] == "admin@gmail.com" for u in r.json())

    def test_list_users_staff_forbidden(self, staff_auth):
        r = requests.get(f"{API}/users", headers=staff_auth["h"], timeout=20)
        assert r.status_code == 403


# --- AI Triage (new feature) ---
class TestAITriage:
    @pytest.fixture(scope="class")
    def ragging(self, student_auth, admin_auth):
        payload = {"title": "TEST_Ragging incident",
                   "description": "Senior students ragging me with physical threats in the hostel block, I am scared for my safety.",
                   "category": "Hostel"}
        r = requests.post(f"{API}/complaints", json=payload, headers=student_auth["h"], timeout=30)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        analyzed = _wait_for_ai(admin_auth["h"], cid)
        yield {"created": r.json(), "analyzed": analyzed, "id": cid}
        # Cleanup
        requests.delete(f"{API}/complaints/{cid}", headers=admin_auth["h"], timeout=20)

    @pytest.fixture(scope="class")
    def wifi(self, student_auth, admin_auth):
        payload = {"title": "TEST_WiFi slow in library",
                   "description": "WiFi in the central library is a bit slow during peak hours, affects browsing speed.",
                   "category": "IT"}
        r = requests.post(f"{API}/complaints", json=payload, headers=student_auth["h"], timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]
        analyzed = _wait_for_ai(admin_auth["h"], cid)
        yield {"created": r.json(), "analyzed": analyzed, "id": cid}
        requests.delete(f"{API}/complaints/{cid}", headers=admin_auth["h"], timeout=20)

    @pytest.fixture(scope="class")
    def food(self, student_auth, admin_auth):
        payload = {"title": "TEST_Mess food poisoning",
                   "description": "Mess food poisoning, several students hospitalized after dinner last night with severe symptoms.",
                   "category": "Mess"}
        r = requests.post(f"{API}/complaints", json=payload, headers=student_auth["h"], timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]
        analyzed = _wait_for_ai(admin_auth["h"], cid)
        yield {"created": r.json(), "analyzed": analyzed, "id": cid}
        requests.delete(f"{API}/complaints/{cid}", headers=admin_auth["h"], timeout=20)

    def test_ragging_critical(self, ragging):
        c = ragging["analyzed"]
        assert c is not None, "AI never returned for ragging complaint"
        assert c["ai_status"] == "done", f"ai_status={c.get('ai_status')} reasoning={c.get('ai_reasoning')}"
        assert c["priority"] == "Critical", f"got priority={c['priority']}"
        assert c["urgency_score"] >= 9, f"got score={c['urgency_score']}"
        assert c["ai_reasoning"], "ai_reasoning is empty"
        joined_tags = " ".join(c.get("ai_tags", [])).lower()
        assert any(k in joined_tags for k in ("ragging", "safety", "harassment", "bullying", "threat")), \
            f"tags missing safety/ragging keywords: {c.get('ai_tags')}"

    def test_wifi_low_or_medium(self, wifi):
        c = wifi["analyzed"]
        assert c is not None
        assert c["ai_status"] == "done", f"reasoning={c.get('ai_reasoning')}"
        assert c["priority"] in ("Low", "Medium"), f"got {c['priority']}"
        assert c["urgency_score"] <= 6, f"got score={c['urgency_score']}"

    def test_food_poisoning_high_or_critical(self, food):
        c = food["analyzed"]
        assert c is not None
        assert c["ai_status"] == "done"
        assert c["priority"] in ("Critical", "High"), f"got {c['priority']}"
        assert c["urgency_score"] >= 8, f"got score={c['urgency_score']}"

    def test_sort_by_urgency_desc(self, staff_auth, ragging, wifi, food):
        # Make sure all three completed
        for fx in (ragging, wifi, food):
            assert fx["analyzed"] and fx["analyzed"]["ai_status"] == "done"
        r = requests.get(f"{API}/complaints?sort_by=urgency_score&order=desc", headers=staff_auth["h"], timeout=20)
        assert r.status_code == 200
        items = r.json()
        scores = [i["urgency_score"] for i in items]
        assert scores == sorted(scores, reverse=True), f"not desc-sorted: {scores[:10]}"
        # Find the three test items relative ordering
        ids = {ragging["id"]: "rag", wifi["id"]: "wifi", food["id"]: "food"}
        seen = [ids[i["id"]] for i in items if i["id"] in ids]
        # ragging & food (>=8) should appear before wifi (<=6)
        if "wifi" in seen:
            wifi_idx = seen.index("wifi")
            for k in ("rag", "food"):
                if k in seen:
                    assert seen.index(k) <= wifi_idx, f"order wrong: {seen}"

    def test_sort_by_priority_maps_to_urgency(self, staff_auth):
        r = requests.get(f"{API}/complaints?sort_by=priority&order=desc", headers=staff_auth["h"], timeout=20)
        assert r.status_code == 200
        scores = [i["urgency_score"] for i in r.json()]
        assert scores == sorted(scores, reverse=True), f"priority-sort not mapped to urgency desc: {scores[:10]}"

    def test_reanalyze_student_forbidden(self, student_auth, ragging):
        r = requests.post(f"{API}/complaints/{ragging['id']}/reanalyze", headers=student_auth["h"], timeout=20)
        assert r.status_code == 403

    def test_reanalyze_staff_resets_then_completes(self, staff_auth, admin_auth, food):
        r = requests.post(f"{API}/complaints/{food['id']}/reanalyze", headers=staff_auth["h"], timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ai_status"] == "pending"
        # Wait for completion again
        analyzed = _wait_for_ai(admin_auth["h"], food["id"])
        assert analyzed and analyzed["ai_status"] == "done"
        assert analyzed["urgency_score"] >= 8

    def test_reanalyze_admin_allowed(self, admin_auth, wifi):
        r = requests.post(f"{API}/complaints/{wifi['id']}/reanalyze", headers=admin_auth["h"], timeout=20)
        assert r.status_code == 200
        assert r.json()["ai_status"] == "pending"

    def test_reanalyze_not_found(self, admin_auth):
        r = requests.post(f"{API}/complaints/{uuid.uuid4()}/reanalyze", headers=admin_auth["h"], timeout=20)
        assert r.status_code == 404
