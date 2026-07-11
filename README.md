# Verdict

> AI-powered assignment grading platform built for educators.

Verdict automates the assignment evaluation workflow by combining asynchronous background processing, AI-assisted rubric evaluation, PDF parsing, and real-time progress updates.

Teachers create assignments and grading rubrics. Students submit PDF assignments. Verdict processes every submission through a distributed grading pipeline and delivers structured feedback while keeping users informed through live status updates.

---

## Features

- AI-assisted rubric-based grading
- PDF submission and parsing
- Background job processing with BullMQ
- Real-time grading progress via WebSockets
- Secure JWT authentication
- Teacher and Student workflows
- Assignment and submission management
- Responsive brutalist-inspired interface

---

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router
- Socket.IO Client

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Socket.IO

### AI Pipeline

- Python
- Gemini API
- PDF Processing

---

## Architecture

```text
Student Upload
       │
       ▼
Express API
       │
       ▼
PostgreSQL ─────────────── Prisma
       │
       ▼
Redis Queue (BullMQ)
       │
       ▼
Background Workers
       │
       ├── PDF Parsing
       ├── AI Evaluation
       └── Rubric Scoring
       │
       ▼
Database Update
       │
       ▼
Socket.IO Events
       │
       ▼
Teacher & Student Dashboard
```

---

## Repository Structure

```text
apps/
├── frontend      React application
└── backend       Express API, workers, Prisma schema and WebSocket server
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.9+
- PostgreSQL
- Redis

### Installation

```bash
pnpm install

cp .env.example .env
# Windows PowerShell
# Copy-Item .env.example .env

pnpm --filter verdict-backend exec prisma generate

pnpm --filter verdict-backend exec prisma db push

pnpm dev
```

---

## Environment Variables

Configure the following before running the application.

```env
DATABASE_URL=
REDIS_URL=

JWT_SECRET=

GEMINI_API_KEY=

BUCKET_NAME=
ACCESSKEYID=
SECRETACCESSKEY=
R2_ENDPOINT=

PYTHON_BIN=
```

On Windows:

```text
PYTHON_BIN=python
```

On macOS/Linux:

```text
PYTHON_BIN=python3
```

---

## Local URLs

Frontend

```
http://localhost:5173
```

Backend API

```
http://localhost:4000/api
```

---

## API Documentation

Backend API documentation is available at:

```
apps/backend/API_DOCS.md
```

---

## Roadmap

- Assignment creation
- AI-powered grading pipeline
- Rubric evaluation
- Background workers
- Real-time grading updates
- Submission analytics
- Teacher dashboard
- Student dashboard

---

Built for educators.