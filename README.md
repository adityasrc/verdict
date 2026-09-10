# Verdict

> AI-powered assignment grading platform built for educators.

Verdict automates the assignment evaluation workflow by combining asynchronous background processing, AI-assisted rubric evaluation, PDF parsing, and real-time progress updates.

Teachers create assignments and grading rubrics. Students submit PDF assignments. Verdict processes every submission through a distributed grading pipeline and delivers structured feedback while keeping users informed through live status updates.

---

## Features

- Rubric-based AI grading via Gemini 3.7 Flash
- PDF submission, parsing, and image extraction (PyMuPDF)
- Asynchronous grading pipeline with BullMQ workers
- Real-time grading progress via WebSockets (Socket.IO + Redis Pub/Sub)
- JWT authentication with access and refresh tokens
- Teacher and student role-separated workflows
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
- Redux Toolkit (RTK Query)
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

To build and run the full application in containers:

```bash
docker compose up -d
```

The `docker-compose.yml` expects an `apps/backend/.env` file with production credentials.

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
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-3.7-flash`) |
| `PYTHON_BIN` | No | Python binary name (default: `python3`) |
| `RUN_WORKER_IN_API` | No | Set to `true` to run worker inside the API process |

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

Built for educators.