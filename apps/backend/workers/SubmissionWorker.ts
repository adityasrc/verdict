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


// to trigger pdfParser.py
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
        }); // running python in bg

        proc.stdout.on("data", (data) => {
            const output = data.toString();
            console.log(`Python output: ${output}`);

            const lines = output.split('\n').filter((line: string) => line.trim());

            for (const line of lines) {
                try {
                    const msg = JSON.parse(line);
                    const enrichedMsg = { ...msg, assignmentId, studentId };
                    console.log(`Publishing event:`, enrichedMsg);

                    if (msg.step === "parsing_completed" && msg.result) {
                        extractedData = msg.result;
                    }

                    redis.publish(`submission:${submissionId}`, JSON.stringify(enrichedMsg));
                } catch {
                    console.log(`Non-JSON output (ignored): ${line}`);
                }
            }
        });

        proc.stderr.on("data", (err) => {
            console.error(`Python error: ${err.toString()}`);
        });

        proc.on("error", (error) => {
            console.error(`Python process failed to spawn or errored:`, error);
            reject(error);
        });

        proc.on("close", (code) => {
            console.log(`Python process exited with code: ${code}`);
            if (code === 0) {
                console.log(`Python process completed successfully`);
                resolve(extractedData);
            } else {
                const error = new Error(`Python process failed with code ${code}`);
                console.error(`Error: ${error.message}`);
                reject(error);
            }
        });
    });
}

// to trigger geminiGrader.py
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

        console.log(`Using .env from: ${envPath}`);

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
            const output = data.toString();
            console.log(`Gemini output: ${output}`);

            const lines = output.split('\n').filter((line: string) => line.trim());

            for (const line of lines) {
                try {
                    const msg = JSON.parse(line);
                    const enrichedMsg = { ...msg, assignmentId, studentId };
                    console.log(`Publishing event:`, enrichedMsg);

                    if (msg.step === "gemini_completed" && msg.evaluation) {
                        evaluation = msg.evaluation;
                    }

                    redis.publish(`submission:${submissionId}`, JSON.stringify(enrichedMsg));
                } catch {
                    console.log(`Non-JSON output (ignored): ${line}`);
                }
            }
        });

        proc.stderr.on("data", (err) => {
            console.error(`Gemini error: ${err.toString()}`);
        });

        proc.on("error", (error) => {
            console.error(`Gemini process failed to spawn or errored:`, error);
            reject(error);
        });

        proc.on("close", (code) => {
            console.log(`Gemini process exited with code: ${code}`);
            if (code === 0 && evaluation) {
                console.log(`Gemini evaluation completed successfully`);
                resolve(evaluation);
            } else {
                const error = new Error(`Gemini process failed with code ${code}`);
                console.error(`Error: ${error.message}`);
                reject(error);
            }
        });
    });
}

const worker = new Worker<SubmissionJobData>(
    "grade_assignment",
    async (job: Job<SubmissionJobData>) => {
        console.log(`[Worker] Job received: ${job.id}`);
        const { id, publicUrl, studentId, assignmentId } = job.data;

        // console.log(`Processing submission ${id} for student ${studentId}`);

        // redis.publish(
        //     `submission:${id}`,
        //     JSON.stringify({
        //         step: "submission_started",
        //         percent: 5,
        //         assignmentId,
        //         studentId,
        //     }),
        // );


        await prisma.submission.update({
            where: { id },
            data: { status: "EVALUATING" },
        });

        redis.publish(`submission:${id}`, JSON.stringify({ step: "evaluating", status: "EVALUATING" }));

        // await job.updateProgress(5);

        const tmpDir = path.join(__dirname, "..", "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const pdfPath = path.join(tmpDir, `submission_${id}.pdf`);
        const imagesDir = path.join(tmpDir, "extracted_images", id);

        try {
            // console.log(`[Worker] Downloading PDF for submission ${id}`);

            // redis.publish(
            //     `submission:${id}`,
            //     JSON.stringify({
            //         step: "downloading_pdf",
            //         percent: 5,
            //         assignmentId,
            //         studentId,
            //     }),
            // );

            const fetchOptions = {
                signal: AbortSignal.timeout(30000) // 30 second timeout
            };

            const buffer = await fetch(publicUrl, fetchOptions).then((res) => {
                if (!res.ok) {
                    throw new Error(`Failed to download PDF: ${res.statusText}`);
                }
                return res.arrayBuffer();
            });
            fs.writeFileSync(pdfPath, Buffer.from(buffer));

            // redis.publish(
            //     `submission:${id}`,
            //     JSON.stringify({
            //         step: "pdf_downloaded",
            //         percent: 10,
            //         assignmentId,
            //         studentId,
            //     }),
            // );

            // await job.updateProgress(10);

            // console.log(`Starting Python PDF parser...`);

            const extractedData = await runPython(id, pdfPath, assignmentId, studentId);
            // console.log(
            //     `PDF parsing completed. Extracted ${extractedData.length} pages`,
            // );

            // await job.updateProgress(80);

            // console.log(`Starting Gemini grading...`);

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
            // console.log(`Gemini grading completed. Score: ${evaluation.score}/${assignment.maxScore}`);

            // await job.updateProgress(95);

            // console.log(`Updating submission in database...`);

            const fullFeedback = `**Summary:** ${evaluation.summary}\n\n**Score:** ${evaluation.score}/${assignment.maxScore}\n\n**Detailed Feedback:**\n${evaluation.feedback}`.trim();

            await submissionManager.updateSubmissionGrade(id, {
                score: evaluation.score,
                feedback: fullFeedback,
                status: "GRADED",
            });

            // console.log(`Submission updated in database`);

            // redis.publish(
            //     `submission:${id}`,
            //     JSON.stringify({
            //         step: "grading_completed",
            //         percent: 100,
            //         score: evaluation.score,
            //         maxScore: assignment.maxScore,
            //         status: "GRADED",
            //         assignmentId,
            //         studentId,
            //     }),
            // );

            // await job.updateProgress(100);

            redis.publish(
                `submission:${id}`,
                JSON.stringify({
                    step: "grading_completed",
                    score: evaluation.score,
                    status: "GRADED",
                })
            );

            console.log(`Job ${job.id} completed successfully!`);
            return true;

        } catch (error: any) {

            await prisma.submission.update({
                where: { id },
                data: { status: "FAILED" },
            }).catch(() => { });

            redis.publish(
                `submission:${id}`,
                JSON.stringify({ step: "failed", status: "FAILED", error: error.message })
            );

            throw error;
        } finally {
            try {
                if (fs.existsSync(pdfPath)) {
                    fs.unlinkSync(pdfPath);
                    // console.log(`Deleted temp PDF: ${pdfPath}`);
                }
                if (fs.existsSync(imagesDir)) {
                    fs.rmSync(imagesDir, { recursive: true, force: true });
                    // console.log(`Deleted extracted images: ${imagesDir}`);
                }
            } catch (cleanupErr) {
                console.error("Cleanup failed:", cleanupErr);
            }
        }
    },
    {
        connection: redis,
        concurrency: 1, // one ticket at a time
    },
);

console.log("Worker started and listening for jobs on 'grade_assignment' queue");
console.log("Redis connection:", redis.options.host, redis.options.port);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
    console.log(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});