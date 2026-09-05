import { Queue } from "bullmq";
import { redis } from "./redis.js";

export interface SubmissionJobData {
    id: string;
    publicUrl: string;
    studentId: string;
    assignmentId: string;
}

export const submissionQueue = new Queue<SubmissionJobData>("grade_assignment", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: { count: 100 },
    },
});