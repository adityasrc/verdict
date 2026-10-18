import { Job, Worker } from "bullmq";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { SubmissionManager } from "../api/submission/submission.manager.js";
import { prisma } from "../utils/db.js";
import { redis } from "../utils/redis.js";
import { SubmissionJobData } from "../utils/queue.js";
import { PythonService } from "./python.service.js";

// path to local folder for temporary files
const tempFolder = fileURLToPath(new URL("../temp", import.meta.url));

// sends live progress to redis and caches event history
async function publishEvent(submissionId: string, event: object): Promise<void> {
    const payload = JSON.stringify(event);
    const cacheKey = `submission_events:${submissionId}`;
    await Promise.all([
        redis.publish(`submission:${submissionId}`, payload),
        redis.rpush(cacheKey, payload).then(() => redis.expire(cacheKey, 7200)),
    ]);
}

// processes grading jobs one by one from the queue
export const submissionWorker = new Worker<SubmissionJobData>(
    "grade_assignment",
    async (job: Job<SubmissionJobData>) => {
        const { id, publicUrl, studentId, assignmentId } = job.data;
        console.log(`[Worker] Processing submission ${id}`);

        await fs.mkdir(tempFolder, { recursive: true });
        const pdfPath = path.join(tempFolder, `submission_${id}.pdf`);
        const imagesDir = path.join(tempFolder, "extracted_images", id);

        try {
            // mark submission as evaluating and notify frontend
            await prisma.submission.update({ where: { id }, data: { status: "EVALUATING" } });
            await publishEvent(id, { step: "submission_started", assignmentId, studentId });

            // download uploaded pdf from cloud storage
            await publishEvent(id, { step: "downloading_pdf", assignmentId, studentId });
            const response = await fetch(publicUrl, { signal: AbortSignal.timeout(30000) });
            if (!response.ok) {
                throw new Error(`Failed to download submission (${response.status})`);
            }

            const buffer = await response.arrayBuffer();
            await fs.writeFile(pdfPath, Buffer.from(buffer));
            await publishEvent(id, { step: "pdf_downloaded", assignmentId, studentId });

            // extract text and diagrams from the pdf using python
            const extractedData = await PythonService.parsePDF(pdfPath, id, (event) => {
                publishEvent(id, { ...event, assignmentId, studentId });
            });

            // fetch assignment details and grading rubric
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

            // send extracted content and rubric to ai for grading
            const evaluation = await PythonService.gradeWithAI(extractedData, context, (event) => {
                publishEvent(id, { ...event, assignmentId, studentId });
            });

            // save final score and feedback in the database
            await SubmissionManager.updateSubmissionGrade(id, {
                score: evaluation.score,
                feedback: evaluation as any,
                status: "GRADED",
            });

            // notify frontend that grading has completed
            await publishEvent(id, {
                step: "grading_completed",
                score: evaluation.score,
                maxScore: assignment.maxScore,
                status: "GRADED",
                assignmentId,
                studentId,
            });

            return true;
        } catch (error: any) {
            // mark submission as failed if any step throws an error
            const message = error?.message || "Unknown grading error";
            await prisma.submission.update({ where: { id }, data: { status: "FAILED" } }).catch(() => { });
            await publishEvent(id, { step: "failed", status: "FAILED", error: message, assignmentId, studentId });
            throw error;
        } finally {
            // remove temporary pdf and extracted images from disk
            await Promise.allSettled([
                fs.unlink(pdfPath),
                fs.rm(imagesDir, { recursive: true, force: true }),
            ]);
        }
    },
    {
        connection: redis,
        concurrency: 1,
    }
);

console.log("[Worker] Listening for jobs on 'grade_assignment' queue");
// log worker completion and failure events
submissionWorker.on("completed", (job) => console.log(`[Worker] Job ${job.id} completed`));
submissionWorker.on("failed", (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err.message));
