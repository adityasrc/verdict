```markdown
# Verdict WebSocket Pipeline

This module handles real-time communication for the Verdict backend. It streams live grading progress and system notifications to the frontend so users do not have to refresh the page.

## 1. Connecting the Frontend

Use `socket.io-client` in your React app to connect to the server. Make sure your frontend URL is allowed in the `CORS_ORIGIN` environment variable.

```typescript
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:8600", {
    withCredentials: true,
    autoConnect: true,
});

```

## 2. Client Events (Frontend to Backend)

Your frontend must emit these events to join specific data streams.

**Personal Notifications**

* `subscribe-notifications`: Pass a user ID to start receiving dashboard alerts.
* `unsubscribe-notifications`: Pass a user ID to stop listening.

**Live Grading Rooms**

* `watch-submission`: Pass a submission ID to watch a specific file get graded. The client will start receiving `submission-progress` events.
* `watch-assignment`: Pass an assignment ID (for instructors) to monitor all student activity for that assignment.
* `unwatch-assignment`: Leave the assignment room.

## 3. Server Utilities (Backend to Frontend)

You do not need to write raw Socket.IO code in your Express routes. Import these helpers from `src/ws/utils.js` to push updates from anywhere in your backend.

```typescript
import {
    sendNotificationToUser,
    emitToRoom,
    broadcastSystemAlert
} from "../ws/utils.js";

// Update a specific user's dashboard
sendNotificationToUser("user_id_123", {
    type: "EVALUATION_COMPLETE",
    message: "Your assignment has been graded.",
});

// Stream grading progress to anyone watching this submission
emitToRoom("submission_id_456", "submission-progress", {
    status: "analyzing_syntax",
    progress: 45,
});

// Blast a message to every connected user
broadcastSystemAlert("system-alert", {
    message: "Maintenance scheduled in 10 minutes",
});

```

## 4. System Rules

* **Dedicated Redis Listener:** The WebSocket server uses a cloned Redis connection strictly for listening to background worker updates. Do not use this specific connection for standard database queries.
* **Strictly for Grading:** This pipeline is built entirely to solve the "dashboard blindness" problem during heavy background evaluations. It is not designed for chat features.
* **Graceful Exit:** The socket connections are tied to your main HTTP server and will close cleanly during a server restart.

```