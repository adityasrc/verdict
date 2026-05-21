# Verdict WebSocket Pipeline

## Overview

This module handles the real-time bidirectional communication for the Verdict evaluation engine. It is strictly designed for assignment tracking, live grading progress, and system notifications. It utilizes Redis Pub/Sub to scale across multiple instances.

## Setup

Socket.IO binds directly to the main Express HTTP server (`index.ts`). It handles connections concurrently with standard REST API traffic.

## Client Connection

### Frontend Connection Example

```typescript
import { io } from "socket.io-client";

// The backend runs on port 8600 by default
const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:8600", {
    withCredentials: true,
    autoConnect: true,
});

socket.on("connect", () => {
    console.log("Connected to evaluation pipeline:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected from pipeline");
});

Available Client Events
Notification Pipeline
subscribe-notifications
Subscribe a user to their specific notification channel.

Client emits:

socket.emit("subscribe-notifications", "user_id_here");

unsubscribe-notifications
Remove a user from their notification channel.

Client emits:

socket.emit("unsubscribe-notifications", "user_id_here");

Evaluation Pipeline (Core)
watch-submission
Join a dedicated room for a specific student submission to receive real-time AI grading updates.

Client emits:

socket.emit("watch-submission", "submission_id_here");

Client receives:

socket.on("submission-progress", (data) => {
    console.log("Grading progress updated:", data);
});
watch-assignment
Used by teachers to monitor all incoming submissions and live grading activity for an entire assignment.

Client emits:

socket.emit("watch-assignment", "assignment_id_here");
Client receives:


socket.on("assignment-grading-progress", (data) => {
    console.log("New submission activity:", data);
});
unwatch-assignment
Leave the assignment monitoring room.

Client emits:

socket.emit("unwatch-assignment", "assignment_id_here");
Server-Side Utilities
Use these exported utilities from src/ws/utils.ts to trigger events from your REST API controllers or background workers.


import { sendNotificationToUser, emitToRoom, broadcastSystemAlert } from "../ws/utils.js";

// Notify a specific user (e.g., grading completed)
sendNotificationToUser("user_id_123", {
    type: "EVALUATION_COMPLETE",
    message: "Your assignment has been graded.",
});

// Update a specific room (e.g., live rubric scoring)
emitToRoom("submission_id_456", "submission-progress", {
    status: "analyzing_syntax",
    progress: 45,
});

// Broadcast system-wide alerts
broadcastSystemAlert("system-alert", {
    message: "Maintenance scheduled in 10 minutes",
});
Administrative Utilities

import { getConnectedSockets, getSocketsInRoom } from "../ws/utils.js";

// Useful for analytics or load monitoring
const totalConnections = await getConnectedSockets();
const activeTeachers = await getSocketsInRoom("assignment_id_789");
CORS Configuration
CORS is strictly defined in src/ws/socket.ts. Add your frontend origin to the environment variables:

Code snippet
CORS_ORIGIN=http://localhost:5173
Architecture Notes
Redis Pub/Sub: The server implements ioredis with a dedicated subscriber client to listen for cross-server grading events (submission:*). Do not use the subscriber client for standard Redis caching operations.

Lean Handlers: This pipeline intentionally omits chat, presence, and typing indicators to prioritize resources for evaluation streaming.

Graceful Degradation: The socket server will shut down cleanly along with the HTTP server via the centralized exitHandler.