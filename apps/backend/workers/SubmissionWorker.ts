import { Job, Worker } from "bullmq";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SubmissionManager } from "../api/submission/submission.manager.js";
import { prisma } from "../utils/db.js";
import { redis } from "../utils/redis.js";
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
        redis.rpush(cacheKey, payload).then(() => redis.expire(cacheKey, 7200)),
    ]);
}

const worker = new Worker(
    "grade_assignment",
    async (job: Job) => {
        const { id, publicUrl, studentId, assignmentId } = job.data;
        console.log(`[Worker] Processing ${id}`);

        await prisma.submission.update({ where: { id }, data: { status: "EVALUATING" } });
        await publishEvent(id, { step: "submission_started", percent: 5, assignmentId, studentId });

        const tmpDir = path.join(__dirname, "..", "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const pdfPath = path.join(tmpDir, `submission_${id}.pdf`);
        const imagesDir = path.join(tmpDir, "extracted_images", id);

        try {

            await publishEvent(id, { step: "downloading_pdf", percent: 5, assignmentId, studentId });
            const buffer = await fetch(publicUrl, { signal: AbortSignal.timeout(30000) }).then(res => res.arrayBuffer());
            fs.writeFileSync(pdfPath, Buffer.from(buffer));
            await publishEvent(id, { step: "pdf_downloaded", percent: 10, assignmentId, studentId });


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


            const fullFeedback = `**Summary:** ${evaluation.summary}\n\n**Score:** ${evaluation.score}/${assignment.maxScore}\n\n**Detailed Feedback:**\n${evaluation.feedback}`.trim();

            await submissionManager.updateSubmissionGrade(id, {
                score: evaluation.score,
                feedback: fullFeedback,
                status: "GRADED",
            });

            await publishEvent(id, { step: "grading_completed", score: evaluation.score, maxScore: assignment.maxScore, status: "GRADED", assignmentId, studentId });

            return true;
        } catch (error: any) {
            await prisma.submission.update({ where: { id }, data: { status: "FAILED" } }).catch(() => { });
            await publishEvent(id, { step: "failed", status: "FAILED", error: error.message });
            throw error;
        } finally {
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
            if (fs.existsSync(imagesDir)) fs.rmSync(imagesDir, { recursive: true, force: true });
        }
    },
    { connection: redis, concurrency: 1 }
);

console.log("[Worker] Listening for jobs on 'grade_assignment' queue");
worker.on("failed", (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err.message));