# Verdict Backend API

The API base URL is `http://localhost:4000/api` in local development. Protected routes require `Authorization: Bearer <accessToken>`.

## Setup

From the repository root:

```bash
pnpm install
cp .env.example .env
pnpm --filter verdict-backend exec prisma generate
pnpm --filter verdict-backend exec prisma db push
pnpm dev
```

The root `pnpm dev` command starts the API and the separate BullMQ worker.

## Authentication

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | None | Create a student or teacher account. `role` defaults to `STUDENT`; anyone may choose `TEACHER`. |
| POST | `/auth/login` | None | Sign in with `email` and `password`. |
| POST | `/auth/refresh` | None | Exchange a valid `refreshToken` for new tokens. |
| GET | `/auth/me` | Any signed-in user | Return the current account. |

This portfolio version has no teacher invitation or approval flow. Teachers can access only their own assignments, rubrics, and submissions.

## Assignments

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/assignments` | Teacher | Create an assignment. `title` and `rubricId` are required; `description`, `maxScore`, and `dueDate` are optional. |
| GET | `/assignments/teacher/my-assignments` | Teacher | List the signed-in teacher's assignments. |
| GET | `/assignments/student/all` | Student | List assignments and their attached rubrics. |
| GET | `/assignments/:id` | Signed-in user | Get an assignment. Teachers can access only assignments they own. The PIN is never returned. |
| DELETE | `/assignments/:id` | Teacher | Delete an assignment they own. |

Every new assignment needs a rubric. If the rubric point total differs from the assignment's `maxScore`, the final score is scaled to the assignment's score range.

## Rubrics

All rubric routes require the teacher role and operate only on rubrics owned by the signed-in teacher.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/rubrics` | Create a rubric with `name` and `criteria`. |
| GET | `/rubrics` | List the signed-in teacher's rubrics. |
| GET | `/rubrics/:id` | Get a rubric. |
| PUT | `/rubrics/:id` | Update `name` and/or `criteria`. |
| DELETE | `/rubrics/:id` | Delete an unused rubric. A rubric attached to an assignment cannot be deleted. |

Each criterion has a `name`, `description`, and positive integer `points` value.

## Submissions

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/submissions/uploadUrl` | Student | Get a 10-minute presigned PDF upload URL. Body: `fileName`, `fileSize` in bytes, `type: "application/pdf"`, `assignmentId`, and the 4-digit `pin`. The API refuses files larger than 10 MB. |
| POST | `/submissions` | Student | Register the uploaded file and queue grading. Body: `assignmentId`, `fileKey`, and the `pin`. The API verifies that the file belongs to this student and assignment and is no larger than 10 MB. |
| GET | `/submissions/my-submissions` | Student | List the signed-in student's submissions. |
| GET | `/submissions/assignment/:assignmentId` | Teacher | List submissions for an assignment they own. |
| GET | `/submissions/recent` | Student or teacher | List the signed-in user's recent submissions. |
| POST | `/submissions/reEvaluate` | Teacher | Queue another evaluation for a submission from an assignment they own. Body: `submissionId`. |
| POST | `/submissions/deleteSubmission` | Teacher | Delete a submission from an assignment they own. Body: `submissionId`. |

PINs are checked when requesting an upload URL and when registering the submission. Failed PIN attempts are not rate limited in this portfolio version. The API rate limit applies to authentication endpoints only.

## Live progress

Socket.IO connections require a valid access token. A student can watch their own submission; a teacher can watch submissions and assignment updates for assignments they own.

## Health check

`GET /health` returns `{ "status": "ok" }`.

## Responses

Successful responses use this envelope:

```json
{
  "success": true,
  "data": {}
}
```

Errors use `success: false` and include a `message`.
