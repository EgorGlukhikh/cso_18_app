# CSO 18 App

Production-oriented starter for education centers that need scheduling, attendance tracking, hours accounting, and parent notifications.

This repository can be reused as a baseline for similar projects: tutoring centers, private schools, language schools, therapy centers, and extracurricular programs.

## What this project already does
- Event scheduling with statuses: `PLANNED`, `COMPLETED`, `CANCELED`
- Mandatory cancellation reason for canceled events
- Planned/factual/billable hours calculation
- Parent-child links with business limit: max 2 parents per child
- Per-link reminder flag (`receivesMorningReminder`) to choose who gets notifications
- Basic analytics APIs (summary and cancellation reasons)
- Seed data for a real-world family structure

## Business rules implemented
- 1 lesson = 1 billable hour (with buffer/rest logic handled as business rule)
- Billable hours are counted only for `COMPLETED` events (MVP rule)
- `CANCELED` event requires a reason from the catalog
- Morning reminders are generated only for children linked with `receivesMorningReminder = true`

## Tech stack
- Next.js 16 (App Router, TypeScript)
- Prisma ORM
- PostgreSQL
- Zod for request validation
- ESLint

## Project structure
- `src/app` - UI pages and API routes
- `src/lib` - shared helpers (`db`, validation, hour calculations)
- `prisma/schema.prisma` - data model
- `prisma/seed-cancel-reasons.mjs` - cancellation reasons seed
- `prisma/seed-family.mjs` - sample family seed

## Quick start
1. Install dependencies:
```bash
npm install
```
2. Create env file:
```bash
cp .env.example .env
```
3. Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```
4. Seed reference data:
```bash
npm run prisma:seed-reasons
npm run prisma:seed-family
```
5. Run dev server:
```bash
npm run dev
```

## Environment variables
Create `.env` from `.env.example`.

Required:
- `DATABASE_URL` - PostgreSQL connection string

## Scripts
- `npm run dev` - start local development
- `npm run build` - production build
- `npm run start` - run production build
- `npm run lint` - lint checks
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate -- --name <name>` - create/apply migration
- `npm run prisma:seed-reasons` - seed cancellation reasons
- `npm run prisma:seed-family` - seed parent/student demo data

## API overview
Implemented endpoints:
- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `POST /api/events/:id/status`
- `GET /api/reports/summary`
- `GET /api/reports/cancel-reasons`
- `GET /api/parent-student-links?studentProfileId=...`
- `POST /api/parent-student-links`
- `PATCH /api/parent-student-links`
- `GET /api/parents/:parentProfileId/morning-reminder`

### Example: create event
```http
POST /api/events
Content-Type: application/json

{
  "title": "Math individual lesson",
  "activityType": "INDIVIDUAL_LESSON",
  "plannedStartAt": "2026-02-22T08:00:00.000Z",
  "plannedEndAt": "2026-02-22T08:45:00.000Z",
  "createdByUserId": "<admin_user_id>",
  "participants": [
    { "userId": "<teacher_user_id>", "participantRole": "TEACHER" },
    { "userId": "<student_user_id>", "participantRole": "STUDENT" }
  ]
}
```

### Example: mark event canceled
```http
POST /api/events/:id/status
Content-Type: application/json

{
  "status": "CANCELED",
  "cancelReasonId": "<reason_id>",
  "cancelComment": "Student got sick"
}
```

## Reusing this repo for another center
1. Replace seed scripts with your own organizations, staff, and students.
2. Add authentication (Google OAuth/Auth.js) and role guards.
3. Add payroll formulas (rates per teacher/event type).
4. Integrate Telegram bot scheduler for daily morning messages.
5. Extend analytics with pivot/grid UI and exports.

## Deployment notes (Railway-friendly)
- Use managed PostgreSQL (persistent storage)
- Keep secrets in platform variables
- Run Prisma migrations during deploy
- Avoid storing business data in container filesystem
- Add DB backup policy and uptime/error monitoring

## Current status
MVP foundation: ready for next phase (auth, admin UI, payroll module, Telegram sending worker).
