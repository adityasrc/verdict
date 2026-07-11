# Verdict Backend API

The API base URL is `http://localhost:4000/api` in local development. Protected routes require `Authorization: Bearer <accessToken>`.

## Setup

From the repository root, install dependencies and configure `.env` from `.env.example`. The backend requires `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and the storage and Gemini values used by the grading worker.

```bash
pnpm install
pnpm --filter verdict-backend exec prisma generate
pnpm --filter verdict-backend exec prisma db push
pnpm dev
```

## Authentication

| Method | Path | Authentication | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | None | `email`, `password`, `name`, optional `role` (`STUDENT` or `TEACHER`) |
| POST | `/auth/login` | None | `email`, `password` |
| POST | `/auth/refresh` | None | `refreshToken` |
| GET | `/auth/me` | Any signed-in user | None |

## Assignments

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/assignments` | Teacher | Create an assignment. Body: `title`, optional `description`, `maxScore`, `dueDate`, `rubricId`, and `requireUniqueId`. |
| GET | `/assignments/teacher/my-assignments` | Teacher | List the signed-in teacher's assignments. |
| GET | `/assignments/student/all` | Signed-in user | List published assignments. |
| GET | `/assignments/:id` | Signed-in user | Get an assignment. The session PIN is never returned. |

## Rubrics

All rubric routes require the teacher role and operate only on rubrics owned by the signed-in teacher.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/rubrics` | Create a rubric with `name` and `criteria`. |
| GET | `/rubrics` | List the signed-in teacher's rubrics. |
| GET | `/rubrics/:id` | Get a rubric. |
| PUT | `/rubrics/:id` | Update `name` and/or `criteria`. |
| DELETE | `/rubrics/:id` | Delete a rubric. |

Each rubric criterion contains `name`, `description`, and `points`.

## Submissions

Student submission routes require the student role.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/submissions/verifyAssignmentOtp` | Check an assignment PIN. Body: `assignmentId`, `otp`. |
| GET | `/submissions/uploadUrl` | Get a short-lived upload URL. Query: `fileName`, `type`, `assignmentId`, `otp`. |
| POST | `/submissions` | Register a submission and queue grading. Body: `assignmentId`, `otp`, optional `studentUniqueId`. The ID is required when the assignment requires it. |
| GET | `/submissions/my-submissions` | List the signed-in student's submissions. |
| GET | `/submissions/assignment/:assignmentId` | Teacher-only list of submissions for an assignment they own. |
| GET | `/submissions/recent` | Recent submissions available to the signed-in user. |
| POST | `/submissions/reEvaluate` | Teacher-only. Body: `submissionId`. |
| POST | `/submissions/allowResubmission` | Teacher-only. Body: `submissionId`. |

Submission PIN checks are rate limited. Upload URLs expire after 10 minutes.

## Health check

`GET /health` returns the API status and a timestamp.

## Responses

Successful responses use the following envelope:

```json
{
  "success": true,
  "data": {}
}
```

Validation and application errors use `success: false` with a message and, where applicable, error details.
