# HackHive Schedule — PRD

## Original Problem Statement
Build a full-stack hackathon-ready web app, "HackHive Schedule", a smart collaborative meeting scheduling platform. Users create meetings with multiple time slots, share with participants, vote/select preferred slots, auto-finalize via majority voting, generate meeting links, send notifications, track attendance, and provide recordings to missed users.

## Stack (final)
- **Backend**: FastAPI + Motor (async MongoDB) + JWT (bcrypt) + cookie + Bearer fallback
- **Frontend**: React + Tailwind + shadcn/ui (customized neo-brutalist) + axios + react-router-dom v7 + sonner
- **Auth**: Email/password JWT
- **Email**: Console-log simulation only (notifications also persisted in DB)
- **Video**: Auto-generated Jitsi room links
- **Design**: Neo-Brutalist "Hive" — Cabinet Grotesk / Space Grotesk + IBM Plex (mono+sans), amber #FFB000 + black, hard 4px shadows, 2px black borders

## User Personas
1. **Host (admin)** — Creates meetings, finalizes slots, marks attendance, posts recordings
2. **Participant** — Receives invites, votes on slots, joins Jitsi room

## Core Requirements (static)
- Multi-slot meeting polls with voting + dedup
- Majority-vote auto-finalize OR manual finalize
- Overlap detection per host
- Jitsi link auto-generated on creation
- .ics calendar export
- Attendance tracking (attended/missed)
- Recording links + missed-user notifications
- Meeting summary (votes/attendance/recording)
- Public shareable poll link via token
- Dashboard with stats & analytics

## What's Implemented (2026-02)
**Backend** (`/app/backend/server.py`):
- Auth: register, login, logout, /me (cookie + Bearer)
- Meetings: create (with overlap detection), list, get, public-poll-by-token, vote, finalize, attendance, recording, .ics export, CSV export per meeting + analytics CSV
- **Pre-meeting reminders**: lazy 1h-before trigger (fired on dashboard load) + manual host "Send reminder now" button
- Notifications: list, mark read, mark all read; auto-emit on create/finalize/recording/reminder
- Dashboard stats; auto-finalize by deadline endpoint
- Admin seed on startup

**Frontend**:
- Landing, Login, Register, Dashboard, CreateMeeting, MeetingDetail (vote+results+attendance+recording), CalendarPage (custom monthly grid), Notifications, Analytics, PublicPoll
- Auth context (cookie + localStorage Bearer fallback)
- Layout with topbar + mobile-tabs + brand
- Neo-brutalist component primitives (`nb-border`, `nb-shadow`, `nb-press`)

## Verified (testing agent iteration_1)
- Backend: 18/18 pytest passing
- Frontend: landing, login (admin@hackhive.dev/admin123), dashboard, calendar, notifications, analytics

## Backlog (P1/P2)
- **P1** Real email integration (Resend/SendGrid) replacing console-log
- **P1** Slot-level capacity caps (UI surfaces "X/Y" per slot)
- **P1** Live vote sync via WebSocket (currently requires page reload)
- **P2** Google Calendar OAuth push (currently .ics only)
- **P2** Background scheduler (cron) for auto-finalize at deadline
- **P2** Additional reminder lead times (24h, 15min) — currently 1h-only
- **P2** Meeting templates / recurring meetings
- **P2** Smart Suggest Slots — propose 3 high-availability blocks based on existing votes

## Test Credentials
- Admin: `admin@hackhive.dev` / `admin123`
- File: `/app/memory/test_credentials.md`
