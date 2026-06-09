# Humbee PWA Access and Secure Submission Portal

A production-ready full-stack React-Express-Prisma-PostgreSQL web application built with strict TypeScript and designed using a premium, light-themed enterprise UI.

## Tech Stack
- **Frontend:** React (Vite, TS, Tailwind CSS, Axios, custom Service Worker PWA, canvas-confetti animations)
- **Backend:** Node.js (Express, TS, JWT validation, bcrypt hashing, express-rate-limit, Zod payload validation)
- **Database:** PostgreSQL (Supabase) with Prisma ORM for schema migrations and seeding

## Features
- **Secure JWT Auth:** Session valid for 24 hours. Persists across page refreshes. Expired sessions automatically route back to `/login`.
- **Protected Routing:** Submission screen is strictly guarded. Back button routing is overwritten on login using routing `replace` history, and browser logout instantly flushes sessions.
- **Dynamic PWA Redirection:** When submission succeeds, the backend securely resolves the external Humbee API session using private credentials, extracts the launch PWA URL dynamically, and returns it. The client launches the PWA in the same tab (`window.location.href`). Hitting back from PWA returns the user directly to the Submission screen, not Login.
- **Admin Dashboard:** Access-restricted dashboard with user management (CRUD) and filtered logs retrieval for database submissions.

---

## Getting Started

### 1. Repository Setup & Dependencies Installation
First, install backend dependencies:
```bash
cd backend
npm install
```
Then, install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 2. Environment & Database Setup
Copy the backend env template and set your Supabase PostgreSQL connection string:
```bash
cd ../backend
cp .env.example .env
# Edit .env and set DATABASE_URL to your Supabase connection string
```

Run migrations and seed:
```bash
npm run db:migrate:deploy
npm run db:seed
```

### 3. Running the Application Locally

**Start Backend Server (Runs on port 5000):**
```bash
cd backend
npm run dev
```

**Start Frontend Client (Runs on port 3000):**
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Render + Supabase (production)

Render does not support IPv6, so Supabase **direct** connections on port `5432` (`db.PROJECT_REF.supabase.co`) fail with `P1001`. Use the **Supavisor pooler** on port `6543` instead.

In Render → backend service → **Environment**, set `DATABASE_URL` to (from Supabase → **Connect** → Transaction pooler, URL-encode special characters in the password):

```
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?sslmode=require&pgbouncer=true&connect_timeout=30
```

---

## Credentials

Use the following seeded accounts to sign in:
- **Standard User Account:**
  - Username: `user`
  - Password: `User1234`
- **Administrator Account:**
  - Username: `admin`
  - Password: `Admin1234`

---

## Verifying the API Integration
You can run automated backend tests locally after launching the backend server.
With the server running on port `5000`, execute the following from the `backend` directory:
```bash
node verify.js
```
