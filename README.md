# Verdict - AI-Powered Automated Grading System

Verdict is a full-stack platform built for educators to automate the grading process of assignments using Large Language Models (Gemini). It extracts text from PDF submissions and grades them against teacher-defined rubrics with high accuracy, saving hours of manual evaluation.

## 🚀 Features

*   **Role-based Access:** Dedicated workflows for Teachers (creating assignments, reviewing grades) and Students (submitting assignments).
*   **AI-Powered Grading:** Uses Gemini AI to evaluate student submissions against detailed rubrics.
*   **PDF Parsing Engine:** Custom Python microservice to accurately extract text and layout from student PDFs.
*   **Asynchronous Processing:** Robust background job queue using BullMQ and Redis to handle heavy PDF parsing and AI grading without blocking the main API.
*   **Real-time Telemetry:** Live websocket updates using Socket.io to stream the grading pipeline progress directly to the frontend interface.
*   **Secure Storage:** Cloudflare R2 / AWS S3 integration for securely storing and accessing student submissions.

## 🛠️ Technology Stack

**Frontend:**
*   React 18 + Vite
*   TypeScript
*   Tailwind CSS + Shadcn UI
*   Redux Toolkit (RTK Query)
*   React Router
*   Socket.io Client

**Backend:**
*   Node.js + Express
*   TypeScript
*   PostgreSQL (Neon)
*   Prisma ORM
*   Redis + BullMQ (Task Queue)
*   Socket.io
*   Python (PDF Extraction + Gemini AI Interface)
*   AWS SDK (S3 / R2)

## ⚙️ Local Development Setup

### Prerequisites
*   Node.js (v20+)
*   Python (v3.9+)
*   pnpm (v9)
*   PostgreSQL Database (or Neon DB URL)
*   Redis Instance (e.g. Upstash)

### 1. Clone the repository
```bash
git clone https://github.com/adityasrc/verdict.git
cd verdict
```

### 2. Install Dependencies
This project uses a monorepo setup via `pnpm` workspaces.
```bash
pnpm install
```

### 3. Environment Variables
Copy the `.env.example` file to `.env` in the root directory and fill in your credentials.
```bash
cp .env.example .env
```

Key variables required:
*   `DATABASE_URL`: PostgreSQL connection string
*   `REDIS_URL`: Redis connection string
*   `GEMINI_API_KEY`: Your Google Gemini API Key
*   `BUCKET_NAME`, `ACCESSKEYID`, `SECRETACCESSKEY`, `R2_ENDPOINT`: Your S3/R2 storage details
*   `JWT_SECRET`: Secure string for JWT signing
*   `PYTHON_BIN`: Set to `python3` (Mac/Linux) or `python` (Windows)

### 4. Database Setup
```bash
cd apps/backend
npx prisma generate
npx prisma db push
```

### 5. Running the Application
You can run the entire stack concurrently from the root directory:

```bash
# Start Frontend, Backend API, and the Background Worker
pnpm run dev
```

The services will be available at:
*   **Frontend:** http://localhost:5173
*   **Backend API:** http://localhost:8600

## 📂 Project Architecture

```
verdict/
├── apps/
│   ├── frontend/         # React SPA
│   └── backend/          # Express API + Worker
│       ├── api/          # Express Controllers & Routes
│       ├── workers/      # BullMQ Worker processing submissions
│       ├── ws/           # Socket.io Server for real-time updates
│       └── prisma/       # Database Schema
├── packages/             # Shared libraries (if any)
└── pnpm-workspace.yaml
```

## 📄 License
This project is licensed under the MIT License.