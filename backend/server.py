from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------- Setup ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("hackhive")

app = FastAPI(title="HackHive Schedule")
api = APIRouter(prefix="/api")


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    if isinstance(dt, str):
        return dt
    return dt.astimezone(timezone.utc).isoformat()

def parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": now_utc() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=60 * 60 * 24 * 7, path="/")

def clear_auth_cookie(response: Response):
    response.delete_cookie("access_token", path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "):
            token = ah[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ---------- Models ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["admin", "participant"] = "participant"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class SlotIn(BaseModel):
    start: datetime
    end: datetime

class MeetingCreateIn(BaseModel):
    title: str
    description: str = ""
    slots: List[SlotIn]
    deadline: datetime
    participant_limit: int = 100
    meeting_type: Literal["group", "private"] = "group"
    invitees: List[EmailStr] = []

class VoteIn(BaseModel):
    slot_id: str

class AttendanceIn(BaseModel):
    user_id: str
    status: Literal["attended", "missed"]

class RecordingIn(BaseModel):
    recording_link: str


# ---------- Notifications ----------
async def notify(user_id: str, ntype: str, message: str, meeting_id: Optional[str] = None):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "message": message,
        "meeting_id": meeting_id,
        "read": False,
        "created_at": iso(now_utc()),
    }
    await db.notifications.insert_one(doc)
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    em = user["email"] if user else user_id
    logger.info(f"[EMAIL-SIM] to={em} type={ntype} msg={message}")


# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user["id"], user["email"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    clear_auth_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------- Meeting Helpers ----------
def slot_label(s: dict) -> str:
    start = parse_dt(s["start"])
    end = parse_dt(s["end"])
    return f"{start.strftime('%a %d %b, %I:%M %p')} – {end.strftime('%I:%M %p')}"

def serialize_meeting(m: dict, current_user_id: Optional[str] = None) -> dict:
    m = {k: v for k, v in m.items() if k != "_id"}
    # vote tally
    tally = {s["id"]: 0 for s in m.get("slots", [])}
    user_vote = None
    for v in m.get("votes", []):
        if v["slot_id"] in tally:
            tally[v["slot_id"]] += 1
        if current_user_id and v["user_id"] == current_user_id:
            user_vote = v["slot_id"]
    m["vote_tally"] = tally
    m["total_votes"] = sum(tally.values())
    m["user_vote"] = user_vote
    return m


def has_overlap(slots_a: list, slots_b: list) -> bool:
    for a in slots_a:
        a_s, a_e = parse_dt(a["start"]), parse_dt(a["end"])
        for b in slots_b:
            b_s, b_e = parse_dt(b["start"]), parse_dt(b["end"])
            if a_s < b_e and a_e > b_s:
                return True
    return False


# ---------- Meeting Endpoints ----------
@api.post("/meetings")
async def create_meeting(payload: MeetingCreateIn, user=Depends(get_current_user)):
    if not payload.slots:
        raise HTTPException(400, "At least one slot is required")

    new_slots = [{"id": str(uuid.uuid4()), "start": iso(s.start), "end": iso(s.end)}
                 for s in payload.slots]

    # Overlap detection: against this user's other active meetings (finalized or upcoming)
    cur = db.meetings.find({"created_by": user["id"], "status": {"$ne": "cancelled"}})
    async for existing in cur:
        ex_slots = []
        if existing.get("final_slot"):
            ex_slots = [existing["final_slot"]]
        else:
            ex_slots = existing.get("slots", [])
        if has_overlap(new_slots, ex_slots):
            raise HTTPException(400, f"Overlap detected with existing meeting: {existing.get('title','?')}")

    poll_token = secrets.token_urlsafe(10)
    room_id = f"hackhive-{uuid.uuid4().hex[:10]}"
    meeting = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "description": payload.description,
        "slots": new_slots,
        "deadline": iso(payload.deadline),
        "final_slot": None,
        "meeting_link": f"https://meet.jit.si/{room_id}",
        "recording_link": None,
        "participant_limit": payload.participant_limit,
        "status": "voting",
        "meeting_type": payload.meeting_type,
        "created_by": user["id"],
        "creator_name": user["name"],
        "invitees": [e.lower() for e in payload.invitees],
        "attendees": [],  # populated when finalized
        "votes": [],
        "poll_token": poll_token,
        "created_at": iso(now_utc()),
    }
    await db.meetings.insert_one(meeting)

    # Notify invitees who already have accounts
    for em in meeting["invitees"]:
        u = await db.users.find_one({"email": em}, {"_id": 0, "id": 1})
        if u:
            await notify(u["id"], "meeting_created",
                         f"You've been invited to vote on '{meeting['title']}'", meeting["id"])
    await notify(user["id"], "meeting_created",
                 f"Your meeting '{meeting['title']}' is now open for voting", meeting["id"])
    return serialize_meeting(meeting, user["id"])


@api.get("/meetings")
async def list_meetings(user=Depends(get_current_user)):
    q = {"$or": [
        {"created_by": user["id"]},
        {"invitees": user["email"]},
        {"meeting_type": "group"},
    ]}
    cur = db.meetings.find(q, {"_id": 0}).sort("created_at", -1)
    items = [serialize_meeting(m, user["id"]) async for m in cur]
    return items


@api.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Meeting not found")
    return serialize_meeting(m, user["id"])


@api.get("/meetings/poll/{token}")
async def get_meeting_by_token(token: str, request: Request):
    m = await db.meetings.find_one({"poll_token": token}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Poll not found")
    uid = None
    try:
        u = await get_current_user(request)
        uid = u["id"]
    except HTTPException:
        pass
    return serialize_meeting(m, uid)


@api.post("/meetings/{meeting_id}/vote")
async def vote(meeting_id: str, payload: VoteIn, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m.get("status") != "voting":
        raise HTTPException(400, "Voting is closed for this meeting")
    if parse_dt(m["deadline"]) < now_utc():
        raise HTTPException(400, "Voting deadline has passed")
    if payload.slot_id not in [s["id"] for s in m.get("slots", [])]:
        raise HTTPException(400, "Invalid slot")

    # capacity per slot (participant_limit divided isn't used; instead total per slot)
    slot_votes = sum(1 for v in m.get("votes", []) if v["slot_id"] == payload.slot_id)
    if slot_votes >= m.get("participant_limit", 100):
        raise HTTPException(400, "Slot is full")

    # prevent duplicate
    existing = next((v for v in m.get("votes", []) if v["user_id"] == user["id"]), None)
    if existing:
        await db.meetings.update_one(
            {"id": meeting_id, "votes.user_id": user["id"]},
            {"$set": {"votes.$.slot_id": payload.slot_id, "votes.$.voted_at": iso(now_utc())}},
        )
    else:
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$push": {"votes": {
                "user_id": user["id"],
                "user_email": user["email"],
                "user_name": user["name"],
                "slot_id": payload.slot_id,
                "voted_at": iso(now_utc()),
            }}},
        )
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return serialize_meeting(m, user["id"])


@api.post("/meetings/{meeting_id}/finalize")
async def finalize(meeting_id: str, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m["created_by"] != user["id"]:
        raise HTTPException(403, "Only the host can finalize")
    if not m.get("votes"):
        raise HTTPException(400, "No votes yet")

    tally = {}
    for v in m["votes"]:
        tally[v["slot_id"]] = tally.get(v["slot_id"], 0) + 1
    winner_id = max(tally, key=tally.get)
    winner = next(s for s in m["slots"] if s["id"] == winner_id)

    attendees = [{"user_id": v["user_id"], "user_email": v["user_email"],
                  "user_name": v["user_name"], "status": "invited"}
                 for v in m["votes"]]

    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"final_slot": winner, "status": "finalized", "attendees": attendees}},
    )

    for a in attendees:
        await notify(a["user_id"], "meeting_finalized",
                     f"'{m['title']}' is locked at {slot_label(winner)}", meeting_id)

    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return serialize_meeting(m, user["id"])


@api.post("/meetings/{meeting_id}/attendance")
async def mark_attendance(meeting_id: str, payload: AttendanceIn, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m["created_by"] != user["id"]:
        raise HTTPException(403, "Only the host can mark attendance")
    res = await db.meetings.update_one(
        {"id": meeting_id, "attendees.user_id": payload.user_id},
        {"$set": {"attendees.$.status": payload.status}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Attendee not found")
    if payload.status == "missed" and m.get("recording_link"):
        await notify(payload.user_id, "recording_available",
                     f"You missed '{m['title']}'. Watch the replay.", meeting_id)
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return serialize_meeting(m, user["id"])


@api.post("/meetings/{meeting_id}/recording")
async def add_recording(meeting_id: str, payload: RecordingIn, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m["created_by"] != user["id"]:
        raise HTTPException(403, "Only the host can add a recording")
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"recording_link": payload.recording_link, "status": "completed"}},
    )
    for a in m.get("attendees", []):
        if a.get("status") == "missed":
            await notify(a["user_id"], "recording_available",
                         f"Recording is up for '{m['title']}'", meeting_id)
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return serialize_meeting(m, user["id"])


@api.get("/meetings/{meeting_id}/export.csv")
async def export_meeting_csv(meeting_id: str, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Meeting not found")
    slot_label_by_id = {s["id"]: slot_label(s) for s in m.get("slots", [])}
    lines = ["section,name,email,slot,voted_at,attendance_status"]
    for v in m.get("votes", []):
        lines.append(f'votes,"{v.get("user_name","")}","{v.get("user_email","")}","{slot_label_by_id.get(v.get("slot_id"),"")}",{v.get("voted_at","")},')
    for a in m.get("attendees", []):
        lines.append(f'attendance,"{a.get("user_name","")}","{a.get("user_email","")}",,,{a.get("status","")}')
    csv_body = "\r\n".join(lines) + "\r\n"
    return Response(content=csv_body, media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{m["title"]}-export.csv"'})


@api.get("/analytics/export.csv")
async def export_analytics_csv(user=Depends(get_current_user)):
    q = {"$or": [{"created_by": user["id"]},
                 {"invitees": user["email"]},
                 {"meeting_type": "group"}]}
    cur = db.meetings.find(q, {"_id": 0})
    lines = ["meeting,status,total_votes,attended,missed,final_slot,created_at"]
    async for m in cur:
        attended = sum(1 for a in m.get("attendees", []) if a.get("status") == "attended")
        missed = sum(1 for a in m.get("attendees", []) if a.get("status") == "missed")
        final = slot_label(m["final_slot"]) if m.get("final_slot") else ""
        title = (m.get("title", "") or "").replace('"', "'")
        lines.append(f'"{title}",{m.get("status","")},{len(m.get("votes", []))},{attended},{missed},"{final}",{m.get("created_at","")}')
    csv_body = "\r\n".join(lines) + "\r\n"
    return Response(content=csv_body, media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="hackhive-analytics.csv"'})


@api.get("/meetings/{meeting_id}/ics")
async def export_ics(meeting_id: str, user=Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Meeting not found")
    slot = m.get("final_slot") or (m["slots"][0] if m.get("slots") else None)
    if not slot:
        raise HTTPException(400, "No slot available")
    start = parse_dt(slot["start"])
    end = parse_dt(slot["end"])

    def fmt(d):
        return d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    ics = (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//HackHive//EN\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{m['id']}@hackhive\r\n"
        f"DTSTAMP:{fmt(now_utc())}\r\n"
        f"DTSTART:{fmt(start)}\r\nDTEND:{fmt(end)}\r\n"
        f"SUMMARY:{m['title']}\r\n"
        f"DESCRIPTION:{(m.get('description','') + ' Join: ' + m.get('meeting_link',''))}\r\n"
        f"LOCATION:{m.get('meeting_link','')}\r\n"
        "END:VEVENT\r\nEND:VCALENDAR\r\n"
    )
    return Response(content=ics, media_type="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="{m["title"]}.ics"'})


# ---------- Dashboard / Analytics ----------
@api.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    q = {"$or": [{"created_by": user["id"]},
                 {"invitees": user["email"]},
                 {"meeting_type": "group"}]}
    total = await db.meetings.count_documents(q)
    voting = await db.meetings.count_documents({**q, "status": "voting"})
    finalized = await db.meetings.count_documents({**q, "status": "finalized"})
    completed = await db.meetings.count_documents({**q, "status": "completed"})

    # Attendance rollup across hosted meetings
    attended = missed = 0
    cur = db.meetings.find({"created_by": user["id"]}, {"_id": 0, "attendees": 1})
    async for m in cur:
        for a in m.get("attendees", []):
            if a.get("status") == "attended":
                attended += 1
            elif a.get("status") == "missed":
                missed += 1
    return {
        "total_meetings": total,
        "active_polls": voting,
        "finalized_meetings": finalized,
        "completed_meetings": completed,
        "attendance": {"attended": attended, "missed": missed},
    }


# ---------- Notifications ----------
@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    cur = db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    return [n async for n in cur]


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- Auto-finalize cron-like check (run lazily at any list call) ----------
async def _send_reminder(m: dict, kind: str = "1h"):
    """Send pre-meeting reminder to all attendees of a finalized meeting."""
    if not m.get("final_slot"):
        return 0
    sent = 0
    final = m["final_slot"]
    label = slot_label(final)
    tier_label = {"24h": "in ~24 hours", "1h": "in ~1 hour", "15m": "in ~15 minutes",
                  "manual": "soon"}.get(kind, "soon")
    msg = f"Reminder: '{m['title']}' starts {tier_label} ({label}) · join {m.get('meeting_link','')}"
    for a in m.get("attendees", []):
        await notify(a["user_id"], "meeting_reminder", msg, m["id"])
        sent += 1
    await db.meetings.update_one(
        {"id": m["id"]},
        {"$addToSet": {"reminders_sent": kind}},
    )
    return sent


@api.post("/meetings/process-reminders")
async def process_reminders(user=Depends(get_current_user)):
    """Lazy trigger: fire 24h, 1h, and 15min reminders for finalized meetings.
    Each tier sends once. Catch-up: if a tier window opens but earlier tiers
    were missed, they're skipped (only fire current/future tiers)."""
    tiers = [
        ("24h", timedelta(hours=24)),
        ("1h", timedelta(hours=1)),
        ("15m", timedelta(minutes=15)),
    ]
    cur = db.meetings.find({"status": {"$in": ["finalized", "completed"]}, "final_slot": {"$ne": None}})
    triggered = {"24h": 0, "1h": 0, "15m": 0}
    async for m in cur:
        start = parse_dt(m["final_slot"]["start"])
        if start <= now_utc():
            continue
        sent = set(m.get("reminders_sent") or [])
        for kind, window in tiers:
            if kind in sent:
                continue
            if start - now_utc() <= window:
                await _send_reminder(m, kind)
                sent.add(kind)
                triggered[kind] += 1
    return {"reminded": triggered}


@api.post("/meetings/{meeting_id}/send-reminder")
async def send_reminder_manual(meeting_id: str, user=Depends(get_current_user)):
    """Host-triggered manual reminder."""
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m["created_by"] != user["id"]:
        raise HTTPException(403, "Only the host can send reminders")
    if not m.get("final_slot"):
        raise HTTPException(400, "Meeting has no finalized slot")
    if not m.get("attendees"):
        raise HTTPException(400, "No attendees to notify")
    sent = await _send_reminder(m, "manual")
    return {"sent": sent}


@api.post("/meetings/auto-finalize")
async def auto_finalize(user=Depends(get_current_user)):
    cur = db.meetings.find({"status": "voting"})
    finalized_count = 0
    async for m in cur:
        if parse_dt(m["deadline"]) < now_utc() and m.get("votes"):
            tally = {}
            for v in m["votes"]:
                tally[v["slot_id"]] = tally.get(v["slot_id"], 0) + 1
            winner_id = max(tally, key=tally.get)
            winner = next(s for s in m["slots"] if s["id"] == winner_id)
            attendees = [{"user_id": v["user_id"], "user_email": v["user_email"],
                          "user_name": v["user_name"], "status": "invited"} for v in m["votes"]]
            await db.meetings.update_one(
                {"id": m["id"]},
                {"$set": {"final_slot": winner, "status": "finalized", "attendees": attendees}},
            )
            finalized_count += 1
    return {"finalized": finalized_count}


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.meetings.create_index("id", unique=True)
    await db.meetings.create_index("poll_token")
    await db.notifications.create_index("user_id")
    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@hackhive.dev").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "HackHive Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": iso(now_utc()),
        })
        logger.info(f"Seeded admin: {admin_email}")
    else:
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email},
                                      {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "HackHive Schedule", "status": "ok"}


app.include_router(api)

# CORS - allow origin echo for cookie-based auth across preview domains
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
