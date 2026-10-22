import { spawn } from "child_process";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import fs from "fs";

// directory where this service file is located
const currentFolder = fileURLToPath(new URL(".", import.meta.url));


const venvPath = [
    path.resolve(process.cwd(), ".venv/bin/python"),
    path.resolve(currentFolder, "../../../.venv/bin/python"),
].find((p) => fs.existsSync(p));

const PYTHON_BIN = process.env.PYTHON_BIN || venvPath || "python3";

const pythonDir = [
    path.resolve(currentFolder, "python"),
    path.resolve(currentFolder, "workers/python"),
    path.resolve(process.cwd(), "workers/python"),
    path.resolve(process.cwd(), "dist/workers/python"),
].find((dir) => fs.existsSync(dir)) || path.resolve(currentFolder, "python");

export interface ParsedPage {
    page_number: number;
    text: string;
    images: string[];
}

export interface GeminiEvaluation {
    score: number;
    criteria: { name: string; score: number; maxPoints: number; feedback: string }[];
    strengths?: string[];
    weaknesses?: string[];
    feedback: string;
    summary: string;
    raw_response?: string;
}

// structured event shape emitted by python scripts to stdout
export interface PythonEvent {
    step?: string;
    warning?: string;
    error?: string;
    result?: ParsedPage[];
    evaluation?: GeminiEvaluation;
    [key: string]: unknown;
}

interface RunPythonOptions<T> {
    scriptName: string;
    args: string[];
    payload?: unknown;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
    onProgress?: (event: PythonEvent) => void;
    extractResult: (msg: PythonEvent) => T | undefined;
}

export class PythonService {
    // executes a python script in a child process and streams its json output
    private static async runPythonProcess<T>(options: RunPythonOptions<T>): Promise<T> {
        const {
            scriptName,
            args,
            payload,
            timeoutMs = 5 * 60 * 1000,
            env,
            onProgress,
            extractResult,
        } = options;

        return new Promise<T>((resolve, reject) => {
            const scriptPath = path.join(pythonDir, scriptName);
            let result: T | undefined;
            let pythonError = "";
            let stderrOutput = "";
            let settled = false;

            // spawn the python process in the background
            const proc = spawn(PYTHON_BIN, [scriptPath, ...args], {
                cwd: pythonDir,
                env: env ? { ...process.env, ...env } : process.env,
            });

            // kill the process if it runs longer than the timeout limit
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    proc.kill();
                    reject(new Error(`${scriptName} timed out after ${timeoutMs / 1000}s`));
                }
            }, timeoutMs);

            // send json data to python through standard input (stdin)
            if (payload !== undefined) {
                proc.stdin.on("error", () => { });
                const data = typeof payload === "string" ? payload : JSON.stringify(payload);
                proc.stdin.write(data, "utf-8", () => proc.stdin.end());
            }

            // read line-by-line output printed by python to stdout
            const rl = readline.createInterface({ input: proc.stdout });

            rl.on("line", (line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                try {
                    const msg = JSON.parse(trimmed);
                    const extracted = extractResult(msg);
                    if (extracted !== undefined) result = extracted;
                    if (msg.error) pythonError = msg.error;
                    if (onProgress) onProgress(msg);
                } catch {
                    // ignore non-json log lines from python
                }
            });

            // collect any error logs sent by python to stderr
            proc.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString();
            });

            // handle process spawn errors (e.g. python not found)
            proc.on("error", (err) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    reject(err);
                }
            });

            // resolve result or reject when the python script finishes
            proc.on("close", (code) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (code === 0 && result !== undefined) {
                    resolve(result);
                } else {
                    reject(new Error(pythonError || stderrOutput.trim() || `${scriptName} failed with exit code ${code}`));
                }
            });
        });
    }

    // runs pdfParser.py to extract text and images from a pdf
    static async parsePDF(
        filePath: string,
        submissionId: string,
        onProgress?: (event: PythonEvent) => void
    ): Promise<ParsedPage[]> {
        return this.runPythonProcess<ParsedPage[]>({
            scriptName: "pdfParser.py",
            args: [filePath, submissionId],
            timeoutMs: 3 * 60 * 1000,
            onProgress,
            extractResult: (msg) => (msg.step === "parsing_completed" ? (msg.result ?? []) : undefined),
        });
    }

    // runs geminiGrader.py to evaluate extracted student answers against rubric
    static async gradeWithAI(
        extractedData: ParsedPage[],
        context: object,
        onProgress?: (event: PythonEvent) => void
    ): Promise<GeminiEvaluation> {
        const backendDir = path.join(currentFolder, "..");
        return this.runPythonProcess<GeminiEvaluation>({
            scriptName: "geminiGrader.py",
            args: [],
            payload: { extractedData, context },
            env: { DOTENV_PATH: path.join(backendDir, ".env") },
            timeoutMs: 5 * 60 * 1000,
            onProgress,
            extractResult: (msg) => (msg.step === "gemini_completed" ? msg.evaluation : undefined),
        });
    }
}