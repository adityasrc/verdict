import { Job, Worker } from "bullmq";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { SubmissionManager } from "../api/submission/submission.manager.js";
import { prisma } from "../utils/db.js";
import { redis } from "../utils/redis.js";
import { SubmissionJobData } from "../utils/queue.js";
import { PythonService } from "./python.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const submissionManager = new SubmissionManager();
const pythonService = new PythonService();

async function publishEvent(submissionId: string, event: object): Promise<void> {
    const payload = JSON.stringify(event);
    const cacheKey = `submission_events:${submissionId}`;
    await Promise.all([
        redis.publish(`submission:${submissionId}`, payload),
        redis.rpush(cacheKey, payload).then(() => redis.expire(cacheKey, 7200)), // 2 hours
    ]);
}

export const submissionWorker = new Worker<SubmissionJobData>(
    "grade_assignment",
    async (job: Job<SubmissionJobData>) => {
        const { id, publicUrl, studentId, assignmentId } = job.data;
        console.log(`[Worker] Processing ${id}`);

        const tmpDir = path.join(__dirname, "..", "tmp");
        await fs.mkdir(tmpDir, { recursive: true });

        const pdfPath = path.join(tmpDir, `submission_${id}.pdf`);
        const imagesDir = path.join(tmpDir, "extracted_images", id);

        try {
            await prisma.submission.update({ where: { id }, data: { status: "EVALUATING" } });
            await publishEvent(id, { step: "submission_started", assignmentId, studentId });

            await publishEvent(id, { step: "downloading_pdf", assignmentId, studentId });
            const response = await fetch(publicUrl, { signal: AbortSignal.timeout(30000) });
            if (!response.ok) {
                throw new Error(`Failed to download submission (${response.status})`);
            }

            const buffer = await response.arrayBuffer();
            await fs.writeFile(pdfPath, Buffer.from(buffer));
            await publishEvent(id, { step: "pdf_downloaded", assignmentId, studentId });

            const extractedData = await pythonService.parsePDF(id, pdfPath, assignmentId, studentId, publishEvent);

            const assignment = await prisma.assignment.findUniqueOrThrow({
                where: { id: assignmentId },
                include: { rubric: true },
            });

            const context = {
                rubric: assignment.rubric?.criteria || undefined,
                description: assignment.description || undefined,
                title: assignment.title,
                maxScore: assignment.maxScore,
            };

            const evaluation = await pythonService.gradeWithGemini(extractedData, assignmentId, id, studentId, context, publishEvent);

            await submissionManager.updateSubmissionGrade(id, {
                score: evaluation.score,
                feedback: evaluation as any,
                status: "GRADED",
            });

            await publishEvent(id, { step: "grading_completed", score: evaluation.score, maxScore: assignment.maxScore, status: "GRADED", assignmentId, studentId });

            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown grading error";
            await prisma.submission.update({ where: { id }, data: { status: "FAILED" } }).catch(() => { });
            await publishEvent(id, { step: "failed", status: "FAILED", error: message, assignmentId, studentId });
            throw error;
        } finally {
            await fs.unlink(pdfPath).catch(() => { });
            await fs.rm(imagesDir, { recursive: true, force: true }).catch(() => { });
        }
    },
    { connection: redis, concurrency: 1 }
);

console.log("[Worker] Listening for jobs on 'grade_assignment' queue");
submissionWorker.on("failed", (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err.message));
