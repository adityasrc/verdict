# Verdict

> AI-powered assignment grading platform built for educators.

Verdict automates the assignment evaluation workflow by combining asynchronous background processing, AI-assisted rubric evaluation, PDF parsing, and real-time progress updates.

Teachers create assignments and grading rubrics. Students submit PDF assignments. Verdict processes every submission through a distributed grading pipeline and delivers structured feedback while keeping users informed through live status updates.

---

## Features

- Rubric-based AI-assisted grading via Gemini 3.8 Flash; the server checks criterion caps and calculates the final score
- PDF submission, parsing, and image extraction (PyMuPDF)
- Asynchronous grading pipeline with BullMQ workers
- Real-time grading progress via WebSockets (Socket.IO + Redis Pub/Sub)
- JWT authentication with access and refresh token endpoints
- Teacher and student role-separated workflows with per-teacher data ownership
- Assignment creation, rubric management, and submission review
- CSV gradebook export
- PIN-gated assignment access
- Re-evaluation of existing submissions

---

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Native Fetch (`apiClient`)
- React Router
- Socket.IO Client

### Backend

- Node.js 20 · Express
- TypeScript
- Prisma ORM · PostgreSQL
- Redis · BullMQ
- Socket.IO

### AI Pipeline

- Python 3 · PyMuPDF
- Google Gemini API

### Storage

- Cloudflare R2 (or any S3-compatible endpoint)

---

## Architecture

```text
Student Upload
       │
       ▼
Express API ──── PostgreSQL (Prisma)
       │
       ▼
Redis Queue (BullMQ)
       │
       ▼
BullMQ Worker
       ├── Download PDF from R2
       ├── Python: PDF text + image extraction (PyMuPDF)
       └── Python: Gemini evaluation with rubric context
       │
       ▼
Database Update (score, feedback, status)
       │
       ▼
Redis Pub/Sub → Socket.IO → Teacher & Student Dashboard
```

---

## Repository Structure

```text
apps/
├── frontend      React application (Vite)
└── backend       Express API, BullMQ workers, WebSocket server, Prisma schema
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.9+ with pip
- PostgreSQL
- Redis

### Installation

```bash
# Install dependencies
pnpm install

# Copy and configure environment
cp .env.example .env

# Generate Prisma client and push schema
pnpm --filter verdict-backend exec prisma generate
pnpm --filter verdict-backend exec prisma db push

# Install Python grading dependencies
pip3 install -r apps/backend/workers/python/requirements.txt

# Start all services
pnpm dev
```

---

## Docker

Infrastructure services (PostgreSQL, Redis, MinIO) can be started with:

```bash
docker compose -f docker-compose.dev.yml up -d
```

To build and run the API and worker in separate containers:

```bash
cp .env.example apps/backend/.env
docker compose up -d --build
```

The API applies Prisma migrations before it starts. Existing databases created with `prisma db push` need a one-time migration baseline before switching to `migrate deploy`; do not point the new startup command at an unbaselined existing database.

The Render Blueprint defines a web service and a separate background worker. Render does not offer a free compute plan for background workers, so the worker service uses a paid plan. See [Render's plan details](https://render.com/docs/compute-plans).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection URL |
| `JWT_SECRET` | Yes | Secret for access token signing |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh token signing |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `R2_ENDPOINT` | Yes | S3-compatible storage endpoint |
| `BUCKET_NAME` | Yes | Storage bucket name |
| `ACCESSKEYID` | Yes | Storage access key |
| `SECRETACCESSKEY` | Yes | Storage secret key |
| `PUBLIC_ENDPOINT` | Yes | Public base URL for stored files |
| `CORS_ORIGIN` | No | Allowed origin(s), comma-separated |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-3.8-flash`) |
| `PYTHON_BIN` | No | Python binary name used by the worker (default: `python3`) |
| `VITE_API_URL` | Production | API base URL, including `/api` (set at frontend build time) |
| `VITE_WS_URL` | Production | Backend origin used for Socket.IO (set at frontend build time) |

---

## Local URLs

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:4000/api` |
| MinIO Console | `http://localhost:9001` |

---

## API Documentation

Full API reference is at [`apps/backend/API_DOCS.md`](apps/backend/API_DOCS.md).

---

## Portfolio scope and limits

- Anyone can choose the teacher role at signup. A teacher can access only assignments, rubrics, and submissions owned by that account. There is no invitation or approval flow.
- PIN checks run when a student requests an upload URL and registers a submission. Failed attempts are not rate limited; adding a Redis counter is a possible next step if the app becomes public.
- Gemini suggests a score for each rubric criterion. The server checks each score against its point cap and calculates the assignment total. Feedback is AI-generated and should be reviewed by a teacher; manual score edits are not implemented.
- Re-evaluation uses the rubric currently attached to the assignment. Rubric history is not snapshotted.
- The API refuses upload URLs for files larger than 10 MB, checks the stored object before queueing it, and the worker enforces the same limit while downloading. A presigned upload can be reused until it expires. Oversized files are not graded, but can remain in the bucket until deleted. Upload requests do not have a separate per-user rate limit.
- Deleting a submission removes its database record, but does not currently delete the uploaded object from R2.
- Database changes are tracked as Prisma migrations. A database previously created with `prisma db push` needs a one-time migration baseline before production uses `prisma migrate deploy`.

These limits are intentional for a small portfolio project. The items above are possible future hardening work, not features currently provided.
---

Built for educators.
