# MotoCare App

Workshop management system para sa isang motorcycle repair shop. May tatlong uri ng user:

- **Customer (rider)** — nagbo-book ng service online, nagre-reschedule, nagta-track ng repair status, nakikipag-chat sa shop, nagre-request ng hardcopy ng receipt.
- **Staff** — floor mechanics / service advisors; humahawak ng queue, bay assignment, stage updates.
- **Admin** — shop owner; may access din sa analytics, audit log, staff management, services catalog.

Tatlong role lang ang meron: `customer`, `staff`, `admin` (wala nang superadmin).

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 3, React Router 7, `lucide-react` icons. Naka-deploy sa Vercel (SPA rewrite sa `vercel.json`).
- **Database / Auth / Realtime:** Supabase (PostgreSQL + Supabase Auth + Realtime channels). Ang frontend ay **direktang** kumakausap sa Supabase gamit ang `src/lib/supabase.ts`.
- **Backend (optional):** `server/` — Node.js + Express + TypeScript REST API (port 5000). Tandaan: `src/lib/api.ts` (client para sa server) ay kasalukuyang hindi ginagamit ng frontend.

## Folder structure

```
src/
  App.tsx                 Routes: / , /track/:code, /walk-in, /login, /reset-password, /dashboard/:page (customer), /internal/:page (staff/admin)
  pages/                  Public pages (Home, Login, TrackStatus, ResetPassword)
  components/             Shared UI (Navbar, home sections, auth/ProtectedRoute, tutorial, legal)
  customer/               Customer dashboard: tabs/ (Overview, BookService, ServiceHistory, Profile, Settings), modals/, components/
  internal/               Staff & Admin console: tabs/ (Queue, Bays, Billing, Analytics, Audit, Staff, Services, ...), modals/, utils/ (auth, permissions, audit logger)
  lib/                    supabase client, realtimeSync (broadcast), hardcopyService, api (unused)
  utils/                  Business logic: bookingLifecycle (missed/reschedule), workshopCapacity, serviceCatalog, motorcycleCatalog, ticketNotesParser, validators
  types/                  Shared TS types (dashboard.ts)
server/src/
  index.ts, routes/ (tickets, admin, messages, motorcycles, profile), middlewares/ (auth, adminOnly), config/supabase.ts, scripts/ (motorcycle seeders)
supabase/functions/       Edge Functions (notify-customer: email notifications)
supabase/migrations/      Clean schema, run in order 00 → 19 (00_reset is dev-only). Ito ang iisang basehan ng database.
supabase/migrations_old/  Lumang migrations (archive lang, huwag nang i-run)
```

## Mahahalagang konsepto

- **`profiles.role`** ay lowercase: `customer`, `staff`, `admin` (tingnan `supabase/migrations/01_profiles.sql`).
- **`service_tickets.status`** ay may CHECK constraint (tingnan `supabase/migrations/03_service_tickets.sql`). Allowed: `PENDING_CONFIRMATION`, `PENDING_DROPOFF`, `CONFIRMED_APPOINTMENT`, `IN_PROGRESS`, `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED`, `MISSED`, `NO_SHOW`, `CANCELLED_BY_ADMIN`. Huwag gumamit ng ibang value.
- **Stages 1–5:** 1 Intake, 2 Bay Inspection, 3 Repair, 4 Quality Testing, 5 Ready for Release.
- Ang booking state ay bahagyang naka-encode sa `notes` bilang tags: `[BOOKING:PENDING_CONFIRMATION]`, `[BOOKING:PENDING_DROPOFF]`, `[MISSED_EXPIRATION...]`, `[LATE_CHECKIN_OVERRIDE...]`, at `Arrival Window: ...`. Gamitin ang `src/utils/ticketNotesParser.ts` sa pag-parse. Hindi kayang idagdag o baguhin ng rider ang mga shop tag (BOOKING, CHECKED_IN, LATE_CHECKIN_OVERRIDE, GRACE_EXTENDED, MISSED_EXPIRATION) — migration 17; kung may bagong rider flow na sumusulat ng tag, i-update ang guard.
- Workshop capacity: 1 bay = 1 online booking/araw, sarado tuwing Linggo. Ang owner (admin) ang nagdadagdag/nagbabawas ng bays sa Bays tab (3 fixed bays na hindi matatanggal, max 12). Naka-save sa `app_settings` key `workshop_bays`, live sa lahat ng device (`src/utils/workshopBays.ts`, `src/utils/workshopCapacity.ts`); ang DB guard ay nasa migration 15–16.
- **Walang bayad na pumapasok sa system.** Sa labas (cash sa counter) ang lahat ng bayaran. Estimate lang ang mga presyo (services, parts approval); walang revenue tracking o sales analytics.
- Realtime updates: `broadcastTicketSync` sa `src/lib/realtimeSync.ts` + Supabase `postgres_changes`.

## Commands

```bash
npm run dev            # Vite dev server (frontend)
npm run server         # Express API (server/) sa watch mode
npm run build          # tsc -b && vite build (frontend)
npm run build:server   # build ng server
npm run build:all      # frontend + server
npm run lint           # ESLint
npm run preview        # preview ng production build
```

Env vars: tingnan ang `.env.example` (frontend) at `server/README.md` (server).

## Rules para kay Claude

- **Palaging mag-explain sa simpleng Taglish.**
- **Magtanong muna bago gumawa ng malalaking changes** (hal. pag-refactor ng maraming file, pagbago ng database schema/migrations, pagbura ng files, o pagbago ng booking/status flow).
- **Huwag mag-`git push`.** Local commit lang. Naka-deploy sa Vercel ang `main`, kaya ang push ay diretsong mapupunta sa live app.
- **Testing ay sa localhost lang** (`npm run dev`).
- **Huwag patakbuhin ang SQL migrations.** Gawin lang ang file at sabihin kung ano ang ira-run sa Supabase SQL Editor.
- **Iisang Supabase project** (`cqkwlyqajtajkvctgdeu`) ang gamit ng local `.env.local`, `server/.env`, ng hardcoded fallback sa code, at ng Vercel. Development pa lang (walang totoong customer), pero tandaan na pareho ang data ng local at live.
