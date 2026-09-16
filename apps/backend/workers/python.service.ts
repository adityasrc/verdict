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

export class PythonService {
    async parsePDF(
        submissionId: string,
        filePath: string,
        assignmentId: string,
        studentId: string,
        publishEvent: (id: string, event: any) => void
    ): Promise<ParsedPage[]> {
        return new Promise<ParsedPage[]>((resolve, reject) => {
            const script = path.join(__dirname, "python", "pdfParser.py");
            let extractedData: ParsedPage[] = [];
            let stderrOutput = "";
            let pythonError = "";
            let settled = false;

            const proc = spawn(PYTHON_BIN, [script, filePath, submissionId], {
                cwd: path.join(__dirname, "python"),
            });

            // Kill the process if it takes longer than 3 minutes (e.g. corrupt PDF)
            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    proc.kill();
                    reject(new Error("PDF parsing timed out after 3 minutes."));
                }
            }, 3 * 60 * 1000);

            const rl = readline.createInterface({ input: proc.stdout });

            rl.on("line", (line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                try {
                    const msg = JSON.parse(trimmed);
                    if (msg.step === "parsing_completed" && msg.result) {
                        extractedData = msg.result;
                    }
                    if (msg.error) {
                        pythonError = msg.error;
                    }
                    publishEvent(submissionId, { ...msg, assignmentId, studentId });
                } catch {
                    /* ignore */
                }
            });

            proc.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString();
            });

            proc.on("error", (err) => {
                if (!settled) { settled = true; clearTimeout(timeout); reject(err); }
            });

            proc.on("close", (code) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                if (code === 0) {
                    resolve(extractedData);
                } else {
                    reject(new Error(pythonError || stderrOutput.trim() || `PDF parsing failed with code ${code}`));
                }
            });
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
        return new Promise<GeminiEvaluation>((resolve, reject) => {
            const script = path.join(__dirname, "python", "geminiGrader.py");
            let evaluation: GeminiEvaluation | null = null;
            let pythonError = "";
            let stderrOutput = "";
            let settled = false;
            const backendDir = path.join(__dirname, "..");

            // stream payload via stdin to avoid cli argument length limits
            const proc = spawn(
                PYTHON_BIN,
                [script, assignmentId, submissionId],
                {
                    env: { ...process.env, DOTENV_PATH: path.join(backendDir, ".env") },
                    cwd: path.join(__dirname, "python"),
                }
            );

            // Kill the process if Gemini API hangs for more than 5 minutes
            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    proc.kill();
                    reject(new Error("AI grading timed out after 5 minutes."));
                }
            }, 5 * 60 * 1000);

            proc.stdin.on("error", () => {});

            const payload = JSON.stringify({ extractedData, context });
            proc.stdin.write(payload, "utf-8", () => {
                proc.stdin.end();
            });

            const rl = readline.createInterface({ input: proc.stdout });

            rl.on("line", (line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                try {
                    const msg = JSON.parse(trimmed);
                    if (msg.step === "gemini_completed" && msg.evaluation) {
                        evaluation = msg.evaluation;
                    }
                    if (msg.error) {
                        pythonError = msg.error;
                    }
                    publishEvent(submissionId, { ...msg, assignmentId, studentId });
                } catch {
                    // ignore JSON parsing errors
                }
            });

            proc.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString();
            });

            proc.on("error", (err) => {
                if (!settled) { settled = true; clearTimeout(timeout); reject(err); }
            });

            proc.on("close", (code) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                if (code === 0 && evaluation) {
                    resolve(evaluation);
                } else {
                    reject(new Error(pythonError || stderrOutput.trim() || `Grading process exited with code ${code}`));
                }
            });
        });
    }
}