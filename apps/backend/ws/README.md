# Verdict WebSocket Pipeline

This module powers real-time updates for the Verdict evaluation engine. It handles assignment tracking, live AI grading progress, and system notifications using Redis Pub/Sub for scalability.

## 1. Connecting the Frontend

Socket.IO runs directly alongside your main Express server. Here is the standard way to connect your Vite frontend:

```typescript
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:8600", {
    withCredentials: true,
    autoConnect: true,
});

```

**Note:** Ensure your frontend URL is whitelisted in your backend environment variables under `CORS_ORIGIN`.

## 2. Client Events

Your frontend can emit these specific events to join or leave real-time rooms.

### Notifications

* **`subscribe-notifications`**: Pass a user ID to connect them to their personal alert channel.
* **`unsubscribe-notifications`**: Pass a user ID to disconnect them.

### Live Grading Rooms

* **`watch-submission`**: Pass a submission ID to join the room. The client will now receive `submission-progress` events.
* **`watch-assignment`**: Pass an assignment ID to let teachers monitor all incoming student activity. The client will receive `assignment-grading-progress` events.
* **`unwatch-assignment`**: Leave the assignment monitoring room.

## 3. Server Utilities

You can trigger WebSocket events from anywhere in your backend (like your REST controllers or background workers) using the exported utilities in `src/ws/utils.js`.

```typescript
import {
    sendNotificationToUser,
    emitToRoom,
    broadcastSystemAlert
} from "../ws/utils.js";

// Send a direct alert to a specific user
sendNotificationToUser("user_id_123", {
    type: "EVALUATION_COMPLETE",
    message: "Your assignment has been graded.",
});

// Stream live AI progress to a specific submission room
emitToRoom("submission_id_456", "submission-progress", {
    status: "analyzing_syntax",
    progress: 45,
});

// Send a global message to every connected client
broadcastSystemAlert("system-alert", {
    message: "Maintenance scheduled in 10 minutes",
});

```

## 4. Architecture Rules

* **Redis Pub/Sub**: The server uses a dedicated Redis subscriber to listen for cross-server grading updates. Never use this specific subscriber instance for standard Redis caching operations.
* **Focused Scope**: This pipeline is strictly optimized for evaluation streaming. Features like chat and typing indicators are intentionally omitted to keep resource usage lean.
* **Graceful Shutdown**: The socket server shuts down cleanly alongside the HTTP server via your centralized exit handler.

```