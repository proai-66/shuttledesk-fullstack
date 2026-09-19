# ShuttleDesk — Full-stack version (test)

Same app as the original `shuttledesk` folder — same UI, same workflow, same
Supabase database — just re-architected into a separate frontend and backend
instead of the frontend talking to Supabase directly.

```
shuttledesk-fullstack/
├── frontend/     Same HTML + vanilla JS + Tailwind (CDN) as before.
│                 Still uses the Supabase client directly for login/session
│                 and the tickets realtime subscription (safe — anon key +
│                 RLS). Everything else (loading/creating/updating tickets,
│                 students, profiles, branches, AI parsing) now calls the
│                 backend API instead of the `tickets`/`students`/... tables.
└── backend/      Node.js + Express API. Receives the caller's Supabase
                  access token on every request, and uses it to build a
                  Supabase client scoped to that token — so Postgres RLS
                  decides what each request can see/change, exactly like
                  before. No permission logic is duplicated here.
```

## Why a backend at all, if RLS still does the enforcement?

It centralizes the *business logic* that used to live in the browser:
- the auto-routing engine (`backend/src/routing.js`)
- ticket-code generation + retry-on-duplicate
- the AI "Fill" ticket-parsing endpoint (now calls Gemini from the backend,
  replacing the old Supabase Edge Function — same prompt, same behaviour)
- creating a new coach/admin login, now done properly server-side with the
  Supabase **service-role** key via `auth.admin.createUser()`, instead of the
  old frontend hack of spinning up a throwaway Supabase client to call `signUp`

## Setup

### 1. Backend

```
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — already filled in, same project as the original app.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API → `service_role` key. **Never** put this in the frontend.
- `GEMINI_API_KEY` — same key used by the old `supabase/functions/parse-ticket` edge function (Supabase dashboard → Edge Functions → parse-ticket → Secrets, or wherever you noted it down originally).
- `CORS_ORIGINS` — the URL your frontend runs on (e.g. VS Code Live Server's `http://127.0.0.1:5500`).

Requires Node 18+ (uses the built-in `fetch`).

```
npm start        # or: npm run dev  (auto-restarts on file change)
```

Runs on `http://localhost:3001` by default.

### 2. Frontend

Same as the original project — open `frontend/` in VS Code, right-click
`index.html` → **Open with Live Server**. If your Live Server doesn't run on
port 5500, update `CORS_ORIGINS` in `backend/.env` and `API_BASE_URL` in
`frontend/js/config.js` to match.

## What's identical to the original `shuttledesk` folder

- Every screen, button, and piece of copy in `views.js`/`events.js`/`i18n.js` — untouched, copied as-is.
- The routing rules, ticket categories, equipment lists, status styling.
- The Supabase schema (`profiles`, `students`, `tickets`, `branches`) and its RLS policies — nothing needed to change there.
- The AI quick-create workflow from the coach's point of view (see `AI_TICKET_GUIDE.md` in the original folder) — identical prompt and fields, just called from a different place.

## What's different

- `frontend/js/data.js` calls `fetch()` against the backend instead of `sb.from(...)` directly.
- `frontend/js/auth.js`'s `adminCreateUser()` calls `POST /api/admin/users` instead of the old temp-client `signUp()` hack.
- The Supabase Edge Function `parse-ticket` is replaced by `backend/src/routes/ai.js` (same Gemini prompt, now runs in this backend instead of a Supabase Edge Function).
