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

            const proc = spawn(PYTHON_BIN, [script, filePath, submissionId], {
                cwd: path.join(__dirname, "python"),
            });

            const rl = readline.createInterface({ input: proc.stdout });

            rl.on("line", (line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                try {
                    const msg = JSON.parse(trimmed);
                    if (msg.step === "parsing_completed" && msg.result) {
                        extractedData = msg.result;
                    }
                    publishEvent(submissionId, { ...msg, assignmentId, studentId });
                } catch {
                }
            });

            proc.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString();
            });

            proc.on("error", reject);

            proc.on("close", (code) => {
                if (code === 0) {
                    resolve(extractedData);
                } else {
                    reject(new Error(stderrOutput.trim() || `PDF parsing failed with code ${code}`));
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
            let stderrOutput = "";
            const backendDir = path.join(__dirname, "..");

            // Stream large payloads via stdin instead of CLI args to avoid OS ARG_MAX / command line length limits
            const proc = spawn(
                PYTHON_BIN,
                [script, assignmentId, submissionId],
                {
                    env: { ...process.env, DOTENV_PATH: path.join(backendDir, ".env") },
                    cwd: path.join(__dirname, "python"),
                }
            );

            proc.stdin.on("error", () => {

            });

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
                    publishEvent(submissionId, { ...msg, assignmentId, studentId });
                } catch {

                }
            });

            proc.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString();
            });

            proc.on("error", reject);

            proc.on("close", (code) => {
                if (code === 0 && evaluation) {
                    resolve(evaluation);
                } else {
                    reject(new Error(stderrOutput.trim() || `Grading process exited with code ${code}`));
                }
            });
        });
    }
}