import { spawn } from "child_process";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPython = process.platform === "win32" ? "python" : "python3";
const PYTHON_BIN = process.env.PYTHON_BIN || defaultPython;

export interface ParsedPage {
    page_number: number;
    text: string;
    images: string[];
}

export interface GeminiEvaluation {
    score: number;
    strengths?: string[];
    weaknesses?: string[];
    feedback: string;
    summary: string;
    raw_response?: string;
}

interface RunPythonOptions<T> {
    scriptName: string;
    args: string[];
    submissionId: string;
    assignmentId: string;
    studentId: string;
    publishEvent: (id: string, event: any) => void;
    payload?: unknown;
    timeoutMs: number;
    timeoutMessage: string;
    fallbackErrorMessage: string;
    env?: NodeJS.ProcessEnv;
    extractResult: (msg: any) => T | undefined;
}

export class PythonService {
    private async runPythonProcess<T>(options: RunPythonOptions<T>): Promise<T> {
        const {
            scriptName,
            args,
            submissionId,
            assignmentId,
            studentId,
            publishEvent,
            payload,
            timeoutMs,
            timeoutMessage,
            fallbackErrorMessage,
            env,
            extractResult,
        } = options;

        return new Promise<T>((resolve, reject) => {
            const script = path.join(__dirname, "python", scriptName);
            let result: T | undefined;
            let pythonError = "";
            let stderrOutput = "";
            let settled = false;

            const proc = spawn(PYTHON_BIN, [script, ...args], {
                cwd: path.join(__dirname, "python"),
                env: env ? { ...process.env, ...env } : process.env,
            });

            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    proc.kill();
                    reject(new Error(timeoutMessage));
                }
            }, timeoutMs);

            if (payload !== undefined) {
                proc.stdin.on("error", () => {});
                const data = typeof payload === "string" ? payload : JSON.stringify(payload);
                proc.stdin.write(data, "utf-8", () => {
                    proc.stdin.end();
                });
            }

            const rl = readline.createInterface({ input: proc.stdout });

            rl.on("line", (line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                try {
                    const msg = JSON.parse(trimmed);
                    const extracted = extractResult(msg);
                    if (extracted !== undefined) {
                        result = extracted;
                    }
                    if (msg.error) {
                        pythonError = msg.error;
                    }
                    publishEvent(submissionId, { ...msg, assignmentId, studentId });
                } catch {
                    /* ignore JSON parsing errors */
                }
            });

            proc.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString();
            });

            proc.on("error", (err) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(err);
                }
            });

            proc.on("close", (code) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                if (code === 0 && result !== undefined) {
                    resolve(result);
                } else {
                    reject(new Error(pythonError || stderrOutput.trim() || `${fallbackErrorMessage} with code ${code}`));
                }
            });
        });
    }

    async parsePDF(
        submissionId: string,
        filePath: string,
        assignmentId: string,
        studentId: string,
        publishEvent: (id: string, event: any) => void
    ): Promise<ParsedPage[]> {
        return this.runPythonProcess<ParsedPage[]>({
            scriptName: "pdfParser.py",
            args: [filePath, submissionId],
            submissionId,
            assignmentId,
            studentId,
            publishEvent,
            timeoutMs: 3 * 60 * 1000,
            timeoutMessage: "PDF parsing timed out after 3 minutes.",
            fallbackErrorMessage: "PDF parsing failed",
            extractResult: (msg) => (msg.step === "parsing_completed" ? (msg.result ?? []) : undefined),
        });
    }

    async gradeWithGemini(
        extractedData: ParsedPage[],
        assignmentId: string,
        submissionId: string,
        studentId: string,
        context: object,
        publishEvent: (id: string, event: any) => void
    ): Promise<GeminiEvaluation> {
        const backendDir = path.join(__dirname, "..");
        return this.runPythonProcess<GeminiEvaluation>({
            scriptName: "geminiGrader.py",
            args: [assignmentId, submissionId],
            submissionId,
            assignmentId,
            studentId,
            publishEvent,
            payload: { extractedData, context },
            env: { DOTENV_PATH: path.join(backendDir, ".env") },
            timeoutMs: 5 * 60 * 1000,
            timeoutMessage: "AI grading timed out after 5 minutes.",
            fallbackErrorMessage: "Grading process exited",
            extractResult: (msg) => (msg.step === "gemini_completed" ? msg.evaluation : undefined),
        });
    }
}