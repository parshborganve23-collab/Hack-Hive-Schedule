"""HackHive Schedule — backend integration tests"""
import os
import random
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vote-sync-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@hackhive.dev"
ADMIN_PASSWORD = "admin123"


# ---------- Helpers ----------
def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    return r


def _client(token=None):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


def _iso(dt):
    return dt.replace(microsecond=0).isoformat()


@pytest.fixture(scope="session")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "token" in body, f"missing token: {body}"
    return body["token"]


@pytest.fixture(scope="session")
def participant_token():
    email = f"test_{uuid.uuid4().hex[:8]}@hackhive.dev"
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Test Part", "email": email, "password": "test123", "role": "participant"},
        timeout=15,
    )
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"
    body = r.json()
    assert "token" in body
    body["_email"] = email
    return body


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_me_with_bearer(self, admin_token):
        c = _client(admin_token)
        r = c.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("role") == "admin"

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_login_bad_password(self):
        r = _login(ADMIN_EMAIL, "wrong-password-xx")
        assert r.status_code in (400, 401)

    def test_register_participant(self, participant_token):
        assert participant_token.get("user", {}).get("role") == "participant"


# ---------- Meetings core flow ----------
@pytest.fixture(scope="class")
def created_meeting(admin_token):
    c = _client(admin_token)
    base = datetime.now(timezone.utc) + timedelta(days=random.randint(30, 300), hours=random.randint(0, 23))
    slots = [
        {"start": _iso(base), "end": _iso(base + timedelta(hours=1))},
        {"start": _iso(base + timedelta(hours=3)), "end": _iso(base + timedelta(hours=4))},
        {"start": _iso(base + timedelta(hours=6)), "end": _iso(base + timedelta(hours=7))},
    ]
    payload = {
        "title": f"TEST_Meeting_{uuid.uuid4().hex[:6]}",
        "description": "pytest meeting",
        "slots": slots,
        "deadline": _iso(base - timedelta(hours=1)),
        "participant_limit": 10,
        "meeting_type": "group",
        "invitees": [],
    }
    r = c.post(f"{API}/meetings", json=payload)
    assert r.status_code in (200, 201), f"create meeting: {r.status_code} {r.text}"
    return r.json()


class TestMeetings:
    def test_create_has_jitsi_and_token(self, created_meeting):
        assert "meet.jit.si" in (created_meeting.get("meeting_link") or "")
        assert created_meeting.get("poll_token")
        assert created_meeting.get("status") == "voting"
        assert created_meeting.get("id")

    def test_list_meetings(self, admin_token, created_meeting):
        c = _client(admin_token)
        r = c.get(f"{API}/meetings")
        assert r.status_code == 200
        ids = [m["id"] for m in r.json()]
        assert created_meeting["id"] in ids

    def test_get_meeting_detail(self, admin_token, created_meeting):
        c = _client(admin_token)
        r = c.get(f"{API}/meetings/{created_meeting['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == created_meeting["id"]

    def test_public_poll_no_auth(self, created_meeting):
        r = requests.get(f"{API}/meetings/poll/{created_meeting['poll_token']}")
        assert r.status_code == 200
        assert r.json()["id"] == created_meeting["id"]

    def test_vote_and_dedup(self, admin_token, participant_token, created_meeting):
        mid = created_meeting["id"]
        slot1 = created_meeting["slots"][0]["id"]
        slot2 = created_meeting["slots"][1]["id"]

        # admin votes slot1
        ra = _client(admin_token).post(f"{API}/meetings/{mid}/vote", json={"slot_id": slot1})
        assert ra.status_code in (200, 201), ra.text

        # participant votes slot2
        rp = _client(participant_token["token"]).post(
            f"{API}/meetings/{mid}/vote", json={"slot_id": slot2}
        )
        assert rp.status_code in (200, 201), rp.text

        # admin re-votes — should update not duplicate
        ra2 = _client(admin_token).post(f"{API}/meetings/{mid}/vote", json={"slot_id": slot2})
        assert ra2.status_code in (200, 201), ra2.text

        # check tally
        r = _client(admin_token).get(f"{API}/meetings/{mid}")
        assert r.status_code == 200
        m = r.json()
        tally = m.get("vote_tally", {})
        # both votes should now be on slot2
        assert tally.get(slot2, 0) == 2, f"expected 2 votes for slot2, got tally={tally}"
        assert tally.get(slot1, 0) == 0

    def test_finalize_host_only(self, admin_token, participant_token, created_meeting):
        mid = created_meeting["id"]
        # non-host should fail
        rp = _client(participant_token["token"]).post(f"{API}/meetings/{mid}/finalize")
        assert rp.status_code in (401, 403), f"non-host finalize allowed: {rp.status_code}"

        ra = _client(admin_token).post(f"{API}/meetings/{mid}/finalize")
        assert ra.status_code in (200, 201), ra.text
        body = ra.json()
        assert body.get("status") == "finalized"
        assert body.get("final_slot")
        assert isinstance(body.get("attendees", []), list)

    def test_attendance_host_only(self, admin_token, participant_token, created_meeting):
        mid = created_meeting["id"]
        uid = participant_token["user"]["id"]
        # non-host
        rp = _client(participant_token["token"]).post(
            f"{API}/meetings/{mid}/attendance", json={"user_id": uid, "status": "attended"}
        )
        assert rp.status_code in (401, 403)
        # host
        ra = _client(admin_token).post(
            f"{API}/meetings/{mid}/attendance", json={"user_id": uid, "status": "missed"}
        )
        assert ra.status_code in (200, 201), ra.text

    def test_recording_completes(self, admin_token, created_meeting):
        mid = created_meeting["id"]
        r = _client(admin_token).post(
            f"{API}/meetings/{mid}/recording",
            json={"recording_link": "https://example.com/rec.mp4"},
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body.get("status") == "completed"
        assert body.get("recording_link") == "https://example.com/rec.mp4"

    def test_ics_export(self, admin_token, created_meeting):
        mid = created_meeting["id"]
        c = _client(admin_token)
        r = c.get(f"{API}/meetings/{mid}/ics")
        assert r.status_code == 200
        assert "text/calendar" in r.headers.get("content-type", "")
        assert "BEGIN:VCALENDAR" in r.text


# ---------- Overlap detection ----------
class TestOverlap:
    def test_overlap_returns_400(self, admin_token):
        c = _client(admin_token)
        base = datetime.now(timezone.utc) + timedelta(days=random.randint(400, 700))
        slots = [{"start": _iso(base), "end": _iso(base + timedelta(hours=2))}]
        payload = {
            "title": f"TEST_Overlap1_{uuid.uuid4().hex[:6]}",
            "description": "",
            "slots": slots,
            "deadline": _iso(base - timedelta(hours=1)),
            "participant_limit": 5,
            "meeting_type": "group",
            "invitees": [],
        }
        r1 = c.post(f"{API}/meetings", json=payload)
        assert r1.status_code in (200, 201), r1.text

        # overlapping slot (starts within window)
        slots2 = [
            {
                "start": _iso(base + timedelta(minutes=30)),
                "end": _iso(base + timedelta(hours=1, minutes=30)),
            }
        ]
        payload2 = {**payload, "title": f"TEST_Overlap2_{uuid.uuid4().hex[:6]}", "slots": slots2}
        r2 = c.post(f"{API}/meetings", json=payload2)
        assert r2.status_code == 400, f"expected 400 for overlap, got {r2.status_code}: {r2.text}"


# ---------- Dashboard / Notifications ----------
class TestDashboardNotifications:
    def test_dashboard_stats(self, admin_token):
        c = _client(admin_token)
        r = c.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        # backend uses total_meetings/active_polls/finalized_meetings/completed_meetings
        for k in ("total_meetings", "active_polls", "finalized_meetings", "completed_meetings", "attendance"):
            assert k in d, f"missing key {k} in {d}"

    def test_notifications_flow(self, admin_token):
        c = _client(admin_token)
        r = c.get(f"{API}/notifications")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)

        # mark all as read should always be OK
        ra = c.post(f"{API}/notifications/read-all")
        assert ra.status_code in (200, 201, 204)

        if items:
            nid = items[0].get("id")
            if nid:
                rr = c.post(f"{API}/notifications/{nid}/read")
                assert rr.status_code in (200, 201, 204, 404)


# ---------- Auto finalize ----------
class TestAutoFinalize:
    def test_auto_finalize(self, admin_token):
        c = _client(admin_token)
        # create a meeting with deadline in the past and votes? deadline already past at creation
        base = datetime.now(timezone.utc) + timedelta(days=random.randint(800, 1200))
        payload = {
            "title": f"TEST_Auto_{uuid.uuid4().hex[:6]}",
            "description": "auto",
            "slots": [
                {"start": _iso(base), "end": _iso(base + timedelta(hours=1))},
                {"start": _iso(base + timedelta(hours=2)), "end": _iso(base + timedelta(hours=3))},
            ],
            "deadline": _iso(datetime.now(timezone.utc) + timedelta(seconds=4)),
            "participant_limit": 5,
            "meeting_type": "group",
            "invitees": [],
        }
        rc = c.post(f"{API}/meetings", json=payload)
        assert rc.status_code in (200, 201)
        m = rc.json()
        # vote
        rv = c.post(f"{API}/meetings/{m['id']}/vote", json={"slot_id": m["slots"][0]["id"]})
        assert rv.status_code in (200, 201)

        # wait for deadline to pass before triggering auto-finalize
        time.sleep(6)

        r = c.post(f"{API}/meetings/auto-finalize")
        assert r.status_code in (200, 201), r.text

        # confirm finalized
        time.sleep(0.5)
        rg = c.get(f"{API}/meetings/{m['id']}")
        assert rg.status_code == 200
        assert rg.json().get("status") in ("finalized", "completed")
