import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useGetUploadUrlMutation,
    useSubmitAssignmentMutation,
} from '../features/assignments/assignmentApi';
import {
    Clock,
    Upload,
    Play,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileText,
} from 'lucide-react';
import { parseApiError } from '../lib/errors';

type GradingStatus = 'idle' | 'processing' | 'completed' | 'failed';
type StageKey = 'upload' | 'parsing' | 'evaluating' | 'graded';
type StageStatus = 'pending' | 'active' | 'completed' | 'failed';

interface SubmissionProgressEvent {
    step: string;
    error?: string;
    page?: number;
    total_pages?: number;
    score?: number;
    maxScore?: number;
    submissionId?: string;
    assignmentId?: string;
    studentId?: string;
}

interface StageDefinition {
    key: StageKey;
    title: string;
}

const STAGES: StageDefinition[] = [
    { key: 'upload', title: 'Upload' },
    { key: 'parsing', title: 'Parsing PDF' },
    { key: 'evaluating', title: 'AI Evaluation' },
    { key: 'graded', title: 'Graded' },
];

const STAGE_ORDER: StageKey[] = ['upload', 'parsing', 'evaluating', 'graded'];

const STEP_LABELS: Record<string, string> = {
    submission_started: 'Job queued',
    downloading_pdf: 'Downloading your file...',
    pdf_downloaded: 'File received',
    parsing_started: 'Reading your PDF...',
    parsing_completed: 'PDF processed',
    gemini_started: 'Starting AI evaluation...',
    gemini_processing: 'Evaluating against rubric...',
    gemini_completed: 'Evaluation received',
    grading_completed: 'Graded',
};

const STEP_TO_STAGE: Record<string, StageKey> = {
    submission_started: 'upload',
    downloading_pdf: 'upload',
    pdf_downloaded: 'upload',
    parsing_started: 'parsing',
    page_parsed: 'parsing',
    parsing_completed: 'parsing',
    gemini_started: 'evaluating',
    gemini_processing: 'evaluating',
    gemini_completed: 'evaluating',
    grading_completed: 'graded',
};

const AssignmentUpload = () => {
    const { assignmentId: rawAssignmentId } = useParams<{ assignmentId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Sanitize assignmentId: Extract clean UUID in case URL has extra text, spaces, or encoded PIN info
    const decodedRawId = decodeURIComponent(rawAssignmentId ?? '').trim();
    const uuidMatch = decodedRawId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const assignmentId = uuidMatch ? uuidMatch[0] : decodedRawId;

    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [pin, setPin] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [currentStage, setCurrentStage] = useState<StageKey | 'idle'>('idle');
    const [gradingStatus, setGradingStatus] = useState<GradingStatus>('idle');
    const [stageMessage, setStageMessage] = useState('');
    const [parsingProgress, setParsingProgress] = useState<{ current: number; total: number } | null>(null);
    const [completedScore, setCompletedScore] = useState<number | null>(null);
    const [watchingSubmissionId, setWatchingSubmissionId] = useState<string | null>(null);

    const [getUploadUrl] = useGetUploadUrlMutation();
    const { data: assignmentData, isLoading, isError, error } = useGetAssignmentQuery(assignmentId, { skip: !assignmentId });
    const [markSubmission] = useSubmitAssignmentMutation();
    const { socket } = useSocket();

    // Auto-prefill PIN if present in query parameter (?pin=1234) or from pasted URL text ("Access PIN: 1234")
    useEffect(() => {
        if (!pin) {
            const queryPin = searchParams.get('pin');
            if (queryPin) {
                setPin(queryPin);
            } else if (decodedRawId) {
                const pinMatch = decodedRawId.match(/(?:pin[:=\s]+)(\d{4})/i);
                if (pinMatch) {
                    setPin(pinMatch[1]);
                }
            }
        }
    }, [decodedRawId, searchParams, pin]);

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: SubmissionProgressEvent) => {
            if (event.error) {
                setGradingStatus('failed');
                setErrorMessage(event.error);
                return;
            }

            if (event.step === 'page_parsed' && event.page && event.total_pages) {
                setGradingStatus('processing');
                setCurrentStage('parsing');
                setParsingProgress({ current: event.page, total: event.total_pages });
                setStageMessage(`Extracting page ${event.page} of ${event.total_pages}…`);
                return;
            }

            if (event.step === 'grading_completed' && typeof event.score === 'number') {
                setGradingStatus('completed');
                setCurrentStage('graded');
                setCompletedScore(event.score);
                setStageMessage(`Graded: ${event.score} pts`);
                return;
            }

            const targetStage = event.step ? STEP_TO_STAGE[event.step] : undefined;
            const label = event.step ? STEP_LABELS[event.step] : undefined;
            if (targetStage) {
                setGradingStatus('processing');
                setCurrentStage(targetStage);
                if (label) setStageMessage(label);
            }
        };

        socket.on('submission-progress', handleProgress);
        return () => {
            socket.off('submission-progress', handleProgress);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket || !watchingSubmissionId) return;

        const rejoin = () => socket.emit('watch-submission', watchingSubmissionId);
        if (socket.connected) rejoin();

        socket.on('connect', rejoin);
        return () => {
            socket.off('connect', rejoin);
        };
    }, [socket, watchingSubmissionId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        if (f.type !== 'application/pdf') {
            setFileError('Invalid format. Only PDF files are accepted.');
            setFile(null);
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setFileError('File too large. Maximum size is 10 MB.');
            setFile(null);
            return;
        }
        setFileError('');
        setFile(f);
    };

    const runPipeline = async () => {
        if (!file) {
            setErrorMessage('Please select a PDF file.');
            return;
        }
        if (!pin || pin.length !== 4) {
            setErrorMessage('Please enter the 4-digit access PIN.');
            return;
        }
        setErrorMessage('');

        try {
            const urlResult = await getUploadUrl({
                fileName: file.name,
                type: file.type,
                assignmentId: assignmentId!,
                pin,
            }).unwrap();

            setGradingStatus('processing');
            setCurrentStage('upload');
            setCompletedScore(null);
            setParsingProgress(null);
            setStageMessage(`Uploading ${file.name} to storage…`);

            await performUpload(urlResult.data);
        } catch (err) {
            setGradingStatus('failed');
            setCurrentStage('upload');
            setErrorMessage(parseApiError(err, 'Failed to start upload.'));
        }
    };

    const performUpload = async (uploadData: { url: string; key: string }) => {
        setIsUploading(true);
        try {
            const uploadRes = await fetch(uploadData.url, {
                method: 'PUT',
                headers: { 'Content-Type': file!.type },
                body: file,
            });

            if (!uploadRes.ok) {
                setGradingStatus('failed');
                setErrorMessage('Upload to storage failed. Please try again.');
                return;
            }

            setStageMessage('Registering submission…');

            const res = await markSubmission({
                assignmentId: assignmentId!,
                fileKey: uploadData.key,
                pin: pin || undefined,
            }).unwrap();

            const submissionId = res.data?.id;
            if (submissionId) {
                setWatchingSubmissionId(submissionId);
                setStageMessage('Submission queued for evaluation…');
            }
        } catch (err) {
            setGradingStatus('failed');
            setErrorMessage(parseApiError(err, 'Submission registration failed. Please try again.'));
        } finally {
            setIsUploading(false);
        }
    };

    const getStageStatus = (stage: StageKey): StageStatus => {
        if (gradingStatus === 'idle') return 'pending';

        const stageIdx = STAGE_ORDER.indexOf(stage);
        const currentIdx = currentStage === 'idle' ? 0 : STAGE_ORDER.indexOf(currentStage);

        if (gradingStatus === 'failed') {
            if (stage === currentStage) return 'failed';
            return stageIdx < currentIdx ? 'completed' : 'pending';
        }

        if (gradingStatus === 'completed') {
            return 'completed';
        }

        if (stageIdx < currentIdx) return 'completed';
        if (stageIdx === currentIdx) return 'active';
        return 'pending';
    };

    const getStageDetail = (stage: StageKey, status: StageStatus, maxScore: number): string => {
        if (status === 'failed') {
            return errorMessage || 'Stage encountered an error';
        }
        if (status === 'pending') {
            if (stage === 'upload') return 'PDF file and PIN verification';
            if (stage === 'parsing') return 'PyMuPDF text and figure extraction';
            if (stage === 'evaluating') return 'Gemini 2.8 Flash analysis against criteria';
            if (stage === 'graded') return 'Final score and recorded feedback';
        }
        if (status === 'active') {
            if (stage === 'upload') return isUploading ? 'Uploading PDF to storage…' : (stageMessage || 'Queued for processing…');
            if (stage === 'parsing') {
                if (parsingProgress) {
                    return `Processing page ${parsingProgress.current} of ${parsingProgress.total}…`;
                }
                return stageMessage || 'Reading your PDF…';
            }
            if (stage === 'evaluating') return stageMessage || 'Evaluating against criteria…';
            if (stage === 'graded') return 'Finalizing grade…';
        }
        // status === 'completed'
        if (stage === 'upload') return 'File received';
        if (stage === 'parsing') return 'PDF processed';
        if (stage === 'evaluating') return 'Evaluation received';
        if (stage === 'graded') return completedScore !== null ? `Score: ${completedScore} / ${maxScore} pts` : 'Graded';
        return '';
    };

    if (isLoading) {
        return (
            <div className="p-12 text-center">
                <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider animate-pulse">Loading assignment…</p>
            </div>
        );
    }

    if (isError || !assignmentData?.data) {
        return (
            <div className="p-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-error-muted border border-error/20 flex items-center justify-center mx-auto text-error">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-text-primary">Assignment Not Found</h2>
                <p className="text-body-sm text-text-secondary">
                    {parseApiError(error, 'Could not load this assignment. Please check the link and try again.')}
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                </Button>
            </div>
        );
    }

    const assignment = assignmentData.data;

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            <header className="border-b border-border pb-6">
                <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider mb-2">
                    Assignment Submission
                </p>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
                        {assignment.title}
                    </h1>
                    <div className="flex items-center gap-4 text-body-sm text-text-secondary">
                        <span className="flex items-center gap-1.5 font-mono text-mono-sm text-text-muted">
                            <Clock className="w-3.5 h-3.5" />
                            Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Open'}
                        </span>
                        <span className="font-mono text-mono-sm text-text-muted">
                            {assignment.maxScore ?? 100} pts max
                        </span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {assignment.rubric?.criteria && Array.isArray(assignment.rubric.criteria) && assignment.rubric.criteria.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-body-sm font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-text-muted" />
                                    Evaluation Rubric
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5">
                                <div className="space-y-2">
                                    {assignment.rubric.criteria.map((c, idx) => (
                                        <div key={idx} className="flex items-baseline justify-between gap-2 text-body-sm">
                                            <span className="text-text-secondary truncate" title={c.name}>{c.name}</span>
                                            <span className="font-mono text-mono-sm text-text-muted shrink-0">{c.points} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-body-sm font-semibold">PDF Document</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`
                                    relative flex flex-col items-center justify-center text-center p-7
                                    border border-dashed border-border rounded-lg bg-surface-raised/30 hover:bg-surface-raised/60
                                    hover:border-border-strong transition-colors
                                    ${isUploading || gradingStatus === 'processing' ? 'border-accent/30' : ''}
                                `}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={handleFileChange}
                                    accept=".pdf,application/pdf"
                                    disabled={isUploading || gradingStatus === 'processing'}
                                />

                                <div className="w-10 h-10 rounded-lg bg-surface-raised border border-border flex items-center justify-center mb-3">
                                    <Upload className="w-4 h-4 text-text-muted" />
                                </div>

                                {file ? (
                                    <div className="space-y-1">
                                        <p className="text-body-sm text-text-primary font-medium">{file.name}</p>
                                        <p className="font-mono text-[11px] text-text-muted">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-body-sm text-text-primary font-medium mb-1">Click or drag PDF here</p>
                                        <p className="font-mono text-[11px] text-text-muted">PDF up to 10 MB</p>
                                    </>
                                )}

                                {fileError && (
                                    <p className="text-error font-mono text-mono-sm font-medium mt-3">{fileError}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-body-sm font-semibold">Submission Verification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="access-pin" className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-2">
                                    4-Digit Access PIN
                                </label>
                                <input
                                    id="access-pin"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-raised font-mono text-xl tracking-[0.4em] text-center text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                                    disabled={isUploading || gradingStatus === 'processing'}
                                    autoComplete="off"
                                />
                                <p className="font-mono text-[11px] text-text-muted mt-1.5">Enter the PIN provided by your teacher</p>
                            </div>

                            {errorMessage && gradingStatus !== 'failed' && (
                                <div className="p-3 bg-error-muted border border-error/20 rounded-md">
                                    <p className="text-error text-body-sm">{errorMessage}</p>
                                </div>
                            )}

                            <Button
                                variant="default"
                                size="default"
                                onClick={runPipeline}
                                disabled={isUploading || gradingStatus === 'processing' || pin.length !== 4 || !file}
                                className="w-full"
                            >
                                <Play className="w-4 h-4 mr-1.5" />
                                {isUploading ? 'Uploading…' : gradingStatus === 'processing' ? 'Evaluation in progress…' : 'Submit & Evaluate'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-7 flex flex-col">
                    <Card className="flex-1 flex flex-col shadow-elevated">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                            <div>
                                <CardTitle className="text-body-md font-semibold">Evaluation Progress</CardTitle>
                                <p className="text-[12px] text-text-muted mt-0.5">Automated rubric grading status</p>
                            </div>
                            <div>
                                {gradingStatus === 'processing' && (
                                    <span className="font-mono text-[11px] text-accent font-medium px-2 py-0.5 rounded bg-accent-muted border border-accent/20">
                                        IN PROGRESS
                                    </span>
                                )}
                                {gradingStatus === 'completed' && (
                                    <span className="font-mono text-[11px] text-success font-medium px-2 py-0.5 rounded bg-success-muted border border-success/20">
                                        GRADED
                                    </span>
                                )}
                                {gradingStatus === 'failed' && (
                                    <span className="font-mono text-[11px] text-error font-medium px-2 py-0.5 rounded bg-error-muted border border-error/20">
                                        FAILED
                                    </span>
                                )}
                                {gradingStatus === 'idle' && (
                                    <span className="font-mono text-[11px] text-text-muted px-2 py-0.5 rounded bg-surface-raised border border-border">
                                        STANDBY
                                    </span>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 flex-1 flex flex-col justify-between">
                            <div className="relative py-2">
                                <div className="absolute left-4 top-5 bottom-5 -translate-x-1/2 border-l-2 border-border pointer-events-none" />

                                <div className="space-y-0">
                                    {STAGES.map((stage) => {
                                        const status = getStageStatus(stage.key);
                                        const detail = getStageDetail(stage.key, status, assignment.maxScore ?? 100);

                                        return (
                                            <div key={stage.key} className="relative flex items-start gap-4 py-4">
                                                <div
                                                    className={`
                                                        relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                                                        ${status === 'completed' ? 'bg-success text-white shadow-sm' : ''}
                                                        ${status === 'active' ? 'bg-accent/20 border-2 border-accent text-accent animate-pulse' : ''}
                                                        ${status === 'failed' ? 'bg-error text-white' : ''}
                                                        ${status === 'pending' ? 'bg-surface-raised border border-border text-text-muted' : ''}
                                                    `}
                                                >
                                                    {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                    {status === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    {status === 'failed' && <AlertCircle className="w-4 h-4 text-white" />}
                                                    {status === 'pending' && <span className="w-2 h-2 rounded-full bg-text-muted/40" />}
                                                </div>

                                                <div className="min-w-0 flex-1 pt-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p
                                                            className={`text-sm font-semibold ${
                                                                status === 'active'
                                                                    ? 'text-text-primary'
                                                                    : status === 'failed'
                                                                        ? 'text-error'
                                                                        : status === 'completed'
                                                                            ? 'text-text-primary'
                                                                            : 'text-text-muted'
                                                            }`}
                                                        >
                                                            {stage.title}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-text-secondary mt-0.5">
                                                        {detail}
                                                    </p>

                                                    {stage.key === 'parsing' && status === 'active' && parsingProgress && (
                                                        <div className="mt-2.5 w-full max-w-xs space-y-1">
                                                            <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden border border-border/50">
                                                                <div
                                                                    className="h-full bg-accent transition-all duration-300 ease-out"
                                                                    style={{
                                                                        width: `${Math.min(100, Math.round((parsingProgress.current / parsingProgress.total) * 100))}%`
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="font-mono text-xs text-text-muted">
                                                                {parsingProgress.current} of {parsingProgress.total} pages extracted
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {gradingStatus === 'completed' && (
                                <div className="mt-6 p-4 rounded-xl border border-border bg-surface-raised/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                            <span className="text-sm font-semibold text-text-primary">
                                                Graded
                                            </span>
                                            {completedScore !== null && (
                                                <span className="font-mono text-xs font-medium px-2 py-0.5 rounded-md bg-surface border border-border text-text-primary">
                                                    {completedScore} / {assignment.maxScore ?? 100} PTS
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-secondary">
                                            Your submission has been evaluated and recorded against the rubric.
                                        </p>
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => navigate('/dashboard')}
                                    >
                                        View Feedback
                                    </Button>
                                </div>
                            )}

                            {gradingStatus === 'failed' && (
                                <div className="mt-6 p-4 rounded-xl border border-error/20 bg-error/5 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-error">
                                            Evaluation Failed
                                        </p>
                                        <p className="text-sm text-text-secondary">
                                            {errorMessage || 'The worker encountered an error during evaluation. Please try again or contact your instructor.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {gradingStatus === 'idle' && (
                                <div className="mt-6 p-3 rounded-xl border border-border/40 bg-surface-raised/20 text-center">
                                    <p className="text-xs text-text-muted">
                                        Select your PDF file and enter the 4-digit PIN to begin grading.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AssignmentUpload;
