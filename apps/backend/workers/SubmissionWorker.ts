import { Job, Worker } from "bullmq";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SubmissionManager } from "../api/submission/submission.manager.js";
import { prisma } from "../utils/db.js";
import { redis } from "../utils/redis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const submissionManager = new SubmissionManager();

/**
 * Publish a grading progress event to Redis pub/sub AND cache it
 * in a list so late-joining sockets can replay missed events.
 */
async function publishEvent(submissionId: string, event: object): Promise<void> {
    const payload = JSON.stringify(event);
    const cacheKey = `submission_events:${submissionId}`;
    await Promise.all([
        redis.publish(`submission:${submissionId}`, payload),
        redis.rpush(cacheKey, payload).then(() => redis.expire(cacheKey, 7200)), // 2-hour TTL
    ]);
}

enum SubmissionStatus {
    PENDING = "PENDING",
    EVALUATING = "EVALUATING",
    REVIEWING = "REVIEWING",
    GRADED = "GRADED",
    FAILED = "FAILED",
}

interface SubmissionJobData {
    id: string;
    publicUrl: string;
    score: number | null;
    feedback: string | null;
    status: SubmissionStatus;
    submittedAt: string;
    gradedAt: string | null;
    studentId: string;
    assignmentId: string;
}

interface ParsedPage {
    page_number: number;
    text: string;
    images: string[];
}

interface GeminiEvaluation {
    score: number;
    strengths?: string[];
    weaknesses?: string[];
    feedback: string;
    summary: string;
    raw_response?: string;
}

function runPython(
    submissionId: string,
    filePath: string,
    assignmentId: string,
    studentId: string,
): Promise<ParsedPage[]> {
    return new Promise<ParsedPage[]>((resolve, reject) => {
        const script = path.join(__dirname, "python", "pdfParser.py");
        let extractedData: ParsedPage[] = [];

        const proc = spawn(process.env.PYTHON_BIN || "python3", [script, filePath, submissionId], {
            cwd: path.join(__dirname, "python"),
        });

        proc.stdout.on("data", (data) => {
            const lines = data.toString().split('\n').filter((line: string) => line.trim());

            for (const line of lines) {
                try {
                    const msg = JSON.parse(line);
                    const enrichedMsg = { ...msg, assignmentId, studentId };

                    if (msg.step === "parsing_completed" && msg.result) {
                        extractedData = msg.result;
                    }

                    publishEvent(submissionId, enrichedMsg);
                } catch {
                    // non-JSON output from Python (e.g. warnings) — safe to ignore
                }
            }
        });

        proc.stderr.on("data", (err) => {
            console.error(`Python error: ${err.toString()}`);
        });

        proc.on("error", (error) => {
            console.error(`Python process failed to spawn:`, error);
            reject(error);
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve(extractedData);
            } else {
                reject(new Error(`Python process failed with code ${code}`));
            }
        });
    });
}

function runGeminiGrader(
    extractedData: ParsedPage[],
    assignmentId: string,
    submissionId: string,
    studentId: string,
    context: {
        rubric?: { name: string; points: number; description: string }[];
        description?: string;
        title?: string;
        maxScore?: number;
    } = {},
): Promise<GeminiEvaluation> {
    return new Promise<GeminiEvaluation>((resolve, reject) => {
        const script = path.join(__dirname, "python", "geminiGrader.py");
        let evaluation: GeminiEvaluation | null = null;

        const extractedDataJson = JSON.stringify(extractedData);
        const contextJson = JSON.stringify(context);

        const backendDir = path.join(__dirname, "..");
        const envPath = path.join(backendDir, ".env");

        const proc = spawn(
            process.env.PYTHON_BIN || "python3",
            [script, extractedDataJson, assignmentId, submissionId, contextJson],
            {
                env: {
                    ...process.env,
                    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
                    DOTENV_PATH: envPath,
                },
                cwd: path.join(__dirname, "python"),
            },
        );

        proc.stdout.on("data", (data) => {
            const lines = data.toString().split('\n').filter((line: string) => line.trim());

            for (const line of lines) {
                try {
                    const msg = JSON.parse(line);
                    const enrichedMsg = { ...msg, assignmentId, studentId };

                    if (msg.step === "gemini_completed" && msg.evaluation) {
                        evaluation = msg.evaluation;
                    }

                    publishEvent(submissionId, enrichedMsg);
                } catch {
                    // non-JSON output from Python — safe to ignore
                }
            }
        });

        proc.stderr.on("data", (err) => {
            console.error(`Gemini error: ${err.toString()}`);
        });

        proc.on("error", (error) => {
            console.error(`Gemini process failed to spawn:`, error);
            reject(error);
        });

        proc.on("close", (code) => {
            if (code === 0 && evaluation) {
                resolve(evaluation);
            } else {
                reject(new Error(`Gemini process failed with code ${code}`));
            }
        });
    });
}

const worker = new Worker<SubmissionJobData>(
    "grade_assignment",
    async (job: Job<SubmissionJobData>) => {
        console.log(`[Worker] Job received: ${job.id}`);
        const { id, publicUrl, studentId, assignmentId } = job.data;

        await prisma.submission.update({
            where: { id },
            data: { status: "EVALUATING" },
        });

        await publishEvent(id, {
            step: "submission_started",
            percent: 5,
            assignmentId,
            studentId,
        });

        const tmpDir = path.join(__dirname, "..", "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const pdfPath = path.join(tmpDir, `submission_${id}.pdf`);
        const imagesDir = path.join(tmpDir, "extracted_images", id);

        try {
            await publishEvent(id, {
                step: "downloading_pdf",
                percent: 5,
                assignmentId,
                studentId,
            });

            const buffer = await fetch(publicUrl, {
                signal: AbortSignal.timeout(30000),
            }).then((res) => {
                if (!res.ok) {
                    throw new Error(`Failed to download PDF: ${res.statusText}`);
                }
                return res.arrayBuffer();
            });
            fs.writeFileSync(pdfPath, Buffer.from(buffer));

            await publishEvent(id, {
                step: "pdf_downloaded",
                percent: 10,
                assignmentId,
                studentId,
            });

            const extractedData = await runPython(id, pdfPath, assignmentId, studentId);

            const assignment = await prisma.assignment.findUnique({
                where: { id: assignmentId },
                include: { rubric: true },
            });

            if (!assignment) {
                throw new Error(`Assignment not found: ${assignmentId}`);
            }

            let formattedRubric:
                | { name: string; points: number; description: string }[]
                | undefined = undefined;

            if (assignment.rubric && Array.isArray(assignment.rubric.criteria)) {
                formattedRubric = (
                    assignment.rubric.criteria as {
                        name: string;
                        points: number;
                        description: string;
                    }[]
                ).map((c) => ({
                    name: c.name,
                    points: c.points,
                    description: c.description,
                }));
            }

            const context = {
                rubric: formattedRubric,
                description: assignment.description || undefined,
                title: assignment.title,
                maxScore: assignment.maxScore,
            };

            const evaluation = await runGeminiGrader(
                extractedData,
                assignmentId,
                id,
                studentId,
                context,
            );

            const fullFeedback = `**Summary:** ${evaluation.summary}\n\n**Score:** ${evaluation.score}/${assignment.maxScore}\n\n**Detailed Feedback:**\n${evaluation.feedback}`.trim();

            await submissionManager.updateSubmissionGrade(id, {
                score: evaluation.score,
                feedback: fullFeedback,
                status: "GRADED",
            });

            await publishEvent(id, {
                step: "grading_completed",
                score: evaluation.score,
                maxScore: assignment.maxScore,
                status: "GRADED",
                assignmentId,
                studentId,
            });

            console.log(`[Worker] Job ${job.id} completed.`);
            return true;

        } catch (error: unknown) {
            await prisma.submission.update({
                where: { id },
                data: { status: "FAILED" },
            }).catch(() => { });

            await publishEvent(id, {
                step: "failed",
                status: "FAILED",
                error: error instanceof Error ? error.message : "Unknown error",
            });

            throw error;
        } finally {
            try {
                if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                if (fs.existsSync(imagesDir)) fs.rmSync(imagesDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error("Cleanup failed:", cleanupErr);
            }
        }
    },
    {
        connection: redis,
        concurrency: 1,
    },
);

console.log("[Worker] Listening for jobs on 'grade_assignment' queue");

worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
    console.error("[Worker] Error:", err);
});