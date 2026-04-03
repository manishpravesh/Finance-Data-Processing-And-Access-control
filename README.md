# Finance Data Processing and Access Control

A full-stack implementation of the assignment with:

- Backend API: Node.js + Express + TypeScript + Prisma + SQLite
- Frontend dashboard: React + Vite + TypeScript
- Role-based access control: Viewer, Analyst, Admin
- Deployment target: Backend on Render, Frontend on Vercel

## 1) Project Structure

- `backend/` - API, database schema, seed, RBAC logic, summary endpoints
- `frontend/` - Finance dashboard UI connected to backend API

## 2) Features Covered

### User and Role Management

- Admin can create users
- Admin can update user role and active status
- Users can log in and get JWT access token
- Account active/inactive checks on login

### Financial Records Management

- CRUD support for financial records
- Filters: `type`, `category`, `startDate`, `endDate`
- Pagination: `page`, `pageSize`

### Dashboard Summary APIs

- Total income
- Total expenses
- Net balance
- Category-wise totals
- Recent activity
- Monthly trends (last N months)

### Access Control

- Viewer: read records and dashboard only
- Analyst: read records and dashboard only
- Admin: full access to records and users

### Validation and Error Handling

- Zod validation on write and filter endpoints
- Standard JSON error responses
- Correct HTTP status codes for auth/validation/conflicts/not-found

## 3) Local Setup

## Prerequisites

- Node.js 20+ (tested on Node 22)

## Backend

```bash
cd backend
npm install
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

Backend runs at `http://localhost:4000`
Health endpoint: `GET /health`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_BASE_URL="http://localhost:4000"
```

## 4) Seed Users

- Admin: `admin@finance.local` / `Admin@123`
- Analyst: `analyst@finance.local` / `Analyst@123`
- Viewer: `viewer@finance.local` / `Viewer@123`

## 5) API Overview

Base URL: `/api`

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Users (admin except `/me`)

- `GET /users/me`
- `GET /users`
- `POST /users`
- `PATCH /users/:id`

### Financial Records

- `GET /records`
- `GET /records/:id`
- `POST /records` (admin)
- `PATCH /records/:id` (admin)
- `DELETE /records/:id` (admin)

### Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/trends?months=6`

## 6) Render Deployment (Backend)

A `backend/render.yaml` file is included.

### Deploy steps

1. Push this repository to GitHub.
2. In Render, create a new Web Service from the repo.
3. Set Root Directory to `backend`.
4. Render should detect settings from `backend/render.yaml`.
5. Set these environment variables in Render:
   - `JWT_SECRET` (required)
   - `CORS_ORIGIN` (set to your Vercel frontend URL, e.g. `https://your-app.vercel.app`)
6. Deploy.

Notes:

- Free-tier Render setup uses ephemeral SQLite storage (`DATABASE_URL=file:./dev.db`).
- Migrations and seed are run in start command so each new instance initializes correctly.
- Seed users and starter records are auto-applied at startup.

## 7) Vercel Deployment (Frontend)

`frontend/vercel.json` is included for SPA routing.

### Deploy steps

1. Import the same GitHub repo in Vercel.
2. Set project Root Directory to `frontend`.
3. Add environment variable:
   - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`
4. Deploy.

## 8) Example Login Request

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finance.local","password":"Admin@123"}'
```

## 9) Assumptions and Tradeoffs

- Chosen SQLite for fast setup and simple demo persistence.
- JWT auth is intentionally lightweight for assignment scope.
- Password reset/refresh tokens/audit logs are out of scope.
- Focused on assignment requirements and deployability over enterprise complexity.
