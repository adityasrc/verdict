import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

            const proc = spawn(process.env.PYTHON_BIN || "python3", [script, filePath, submissionId], {
                cwd: path.join(__dirname, "python"),
            });

            proc.stdout.on("data", (data) => {
                const lines = data.toString().split('\n').filter((line: string) => line.trim());
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.step === "parsing_completed" && msg.result) {
                            extractedData = msg.result;
                        }
                        publishEvent(submissionId, { ...msg, assignmentId, studentId });
                    } catch { /* ignore non-JSON log lines from Python stdout */ }
                }
            });

            proc.stderr.on("data", (err) => console.error(`Python error: ${err.toString()}`));
            proc.on("error", reject);
            proc.on("close", (code) => code === 0 ? resolve(extractedData) : reject(new Error(`Failed with code ${code}`)));
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
            const backendDir = path.join(__dirname, "..");

            const proc = spawn(
                process.env.PYTHON_BIN || "python3",
                [script, JSON.stringify(extractedData), assignmentId, submissionId, JSON.stringify(context)],
                {
                    env: { ...process.env, DOTENV_PATH: path.join(backendDir, ".env") },
                    cwd: path.join(__dirname, "python"),
                }
            );

            proc.stdout.on("data", (data) => {
                const lines = data.toString().split('\n').filter((line: string) => line.trim());
                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.step === "gemini_completed" && msg.evaluation) {
                            evaluation = msg.evaluation;
                        }
                        publishEvent(submissionId, { ...msg, assignmentId, studentId });
                    } catch { /* ignore non-JSON log lines from Python stdout */ }
                }
            });

            proc.stderr.on("data", (err) => console.error(`Gemini error: ${err.toString()}`));
            proc.on("error", reject);
            proc.on("close", (code) => (code === 0 && evaluation) ? resolve(evaluation) : reject(new Error(`Failed with code ${code}`)));
        });
    }
}