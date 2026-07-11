# Verdict

Verdict is an automated grading platform for teachers and students. Teachers create assignments and rubrics; students submit PDF work for asynchronous AI-assisted evaluation.

## Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Redux Toolkit, Socket.IO Client
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO
- Grading: Python PDF parsing and Gemini integration

## Local development

Prerequisites: Node.js 20+, Python 3.9+, pnpm 9+, PostgreSQL, and Redis.

```bash
pnpm install
Copy-Item .env.example .env
pnpm --filter verdict-backend exec prisma generate
pnpm --filter verdict-backend exec prisma db push
pnpm dev
```

The frontend runs at `http://localhost:5173` and the backend API runs at `http://localhost:4000/api` by default.

Set the required values in `.env` before starting the application:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `GEMINI_API_KEY`: Gemini API key
- `BUCKET_NAME`, `ACCESSKEYID`, `SECRETACCESSKEY`, and `R2_ENDPOINT`: S3-compatible storage configuration
- `PYTHON_BIN`: `python3` on macOS/Linux or `python` on Windows

See [the backend API documentation](apps/backend/API_DOCS.md) for endpoint details.

## Repository layout

```text
apps/frontend  React single-page application
apps/backend   Express API, workers, WebSocket server, and Prisma schema
```

## License

MIT
