import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
} from '../features/assignments/assignmentApi';
import {
    Clock,
    Upload,
    Play,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { parseApiError } from '../lib/errors';

type GradingStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface PipelineEventItem {
    id: string;
    step: string;
    label: string;
    detail?: string;
    status: 'info' | 'active' | 'ok' | 'done' | 'failed';
    progress?: { current: number; total: number };
}

const INITIAL_EVENTS: PipelineEventItem[] = [
    {
        id: 'ready',
        step: 'PIPELINE_STANDBY',
        label: 'Grading engine ready · worker listening on BullMQ queue',
        status: 'info',
    },
];

const dotColor: Record<string, string> = {
    info: 'bg-text-muted',
    active: 'bg-accent animate-pulse ring-2 ring-accent/30',
    ok: 'bg-text-secondary',
    done: 'bg-success',
    failed: 'bg-error',
};

const AssignmentUpload = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const terminalEndRef = useRef<HTMLDivElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [pin, setPin] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [events, setEvents] = useState<PipelineEventItem[]>(INITIAL_EVENTS);
    const [rawLogs, setRawLogs] = useState<string[]>(['> Grading engine ready.']);
    const [gradingStatus, setGradingStatus] = useState<GradingStatus>('idle');
    const [completedScore, setCompletedScore] = useState<number | null>(null);
    const [watchingSubmissionId, setWatchingSubmissionId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'stream' | 'raw'>('stream');

    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId ?? '', { skip: !assignmentId });
    const [markSubmission] = useSubmitAssignmentMutation();
    const { socket } = useSocket();

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events, rawLogs]);

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: any) => {
            if (event.error) {
                setGradingStatus('failed');
                setRawLogs(prev => [...prev, `[ERROR] ${event.error}`]);
                setEvents(prev => {
                    const existingFail = prev.find(e => e.step === 'PIPELINE_FAILED');
                    if (existingFail) {
                        return prev.map(e => e.step === 'PIPELINE_FAILED' ? { ...e, label: event.error } : e);
                    }
                    return [
                        ...prev.map(e => e.status === 'active' ? { ...e, status: 'failed' as const } : e),
                        {
                            id: `failed-${Date.now()}`,
                            step: 'PIPELINE_FAILED',
                            label: event.error,
                            status: 'failed',
                        },
                    ];
                });
                return;
            }

            if (event.step === 'submission_started') {
                setGradingStatus('processing');
                setRawLogs(prev => [...prev, '[STATUS] Pipeline initiated...']);
                setEvents(prev => {
                    const cleaned = prev.filter(e => e.status !== 'failed' && e.step !== 'PIPELINE_FAILED');
                    return [
                        ...cleaned.map(e => e.status === 'active' ? { ...e, status: 'ok' as const } : e),
                        {
                            id: 'submission_started',
                            step: 'SUBMISSION_STARTED',
                            label: 'Job queued · status set to EVALUATING',
                            status: 'ok',
                        },
                    ];
                });
            } else if (event.step === 'downloading_pdf') {
                setRawLogs(prev => [...prev, '[INFO] Downloading submission...']);
                setEvents(prev => [
                    ...prev.map(e => e.status === 'active' ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'downloading_pdf',
                        step: 'DOWNLOADING_PDF',
                        label: 'Downloading PDF from Cloudflare R2...',
                        status: 'active',
                    },
                ]);
            } else if (event.step === 'pdf_downloaded') {
                setRawLogs(prev => [...prev, '[OK] Download complete.']);
                setEvents(prev => [
                    ...prev.map(e => e.id === 'downloading_pdf' ? { ...e, status: 'ok' as const, label: 'PDF saved to worker disk' } : e),
                    {
                        id: 'pdf_downloaded',
                        step: 'PDF_DOWNLOADED',
                        label: 'PDF saved to worker disk',
                        status: 'ok',
                    },
                ]);
            } else if (event.step === 'parsing_started') {
                setRawLogs(prev => [...prev, '[INFO] Parsing PDF structure...']);
                const totalPages = event.total_pages;
                setEvents(prev => [
                    ...prev.map(e => e.status === 'active' ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'parsing_started',
                        step: 'PARSING_STARTED',
                        label: totalPages ? `Opening PDF with PyMuPDF (${totalPages} pages)...` : 'Opening PDF with PyMuPDF...',
                        status: 'ok',
                    },
                ]);
            } else if (event.step === 'page_parsed') {
                setRawLogs(prev => [...prev, `[INFO] Page ${event.page}/${event.total_pages} read.`]);
                setEvents(prev => {
                    const existingIndex = prev.findIndex(e => e.id === 'page_parsed');
                    const isComplete = event.page === event.total_pages;
                    const parsedItem: PipelineEventItem = {
                        id: 'page_parsed',
                        step: 'PAGE_PARSED',
                        label: isComplete
                            ? `Pages extracted (${event.total_pages}/${event.total_pages} · text + images)`
                            : `Extracting pages: ${event.page} of ${event.total_pages} (text + images)`,
                        status: isComplete ? 'ok' : 'active',
                        progress: { current: event.page, total: event.total_pages },
                    };

                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = parsedItem;
                        return updated;
                    } else {
                        return [...prev.map(e => e.status === 'active' ? { ...e, status: 'ok' as const } : e), parsedItem];
                    }
                });
            } else if (event.step === 'parsing_completed') {
                setRawLogs(prev => [...prev, '[OK] Parsing complete.']);
                setEvents(prev => [
                    ...prev.map(e => e.id === 'page_parsed' ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'parsing_completed',
                        step: 'PARSING_COMPLETED',
                        label: 'Extraction done · passing to Gemini',
                        status: 'ok',
                    },
                ]);
            } else if (event.step === 'gemini_started') {
                setRawLogs(prev => [...prev, '[STATUS] Verdict AI engine started.']);
                setEvents(prev => [
                    ...prev.map(e => e.status === 'active' ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'gemini_started',
                        step: 'GEMINI_STARTED',
                        label: 'Calling Gemini 3.8 Flash with rubric context...',
                        status: 'active',
                    },
                ]);
            } else if (event.step === 'gemini_processing') {
                setRawLogs(prev => [...prev, '[INFO] Evaluating against rubric...']);
                setEvents(prev => [
                    ...prev.map(e => e.id === 'gemini_started' ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'gemini_processing',
                        step: 'GEMINI_PROCESSING',
                        label: 'Evaluating against rubric criteria · generating breakdown...',
                        status: 'active',
                    },
                ]);
            } else if (event.step === 'gemini_completed') {
                setRawLogs(prev => [...prev, '[OK] Evaluation complete.']);
                setEvents(prev => [
                    ...prev.map(e => (e.id === 'gemini_processing' || e.id === 'gemini_started') ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'gemini_completed',
                        step: 'GEMINI_COMPLETED',
                        label: 'Evaluation received from Gemini',
                        status: 'ok',
                    },
                ]);
            } else if (event.step === 'grading_completed') {
                setRawLogs(prev => [...prev, `[SUCCESS] Score: ${event.score}/${event.maxScore ?? 100}`]);
                setGradingStatus('completed');
                setCompletedScore(event.score);
                setEvents(prev => [
                    ...prev.map(e => e.status === 'active' ? { ...e, status: 'ok' as const } : e),
                    {
                        id: 'grading_completed',
                        step: 'GRADING_COMPLETED',
                        label: `Score saved: ${event.score}/${event.maxScore ?? assignmentData?.data?.maxScore ?? 100} pts · status set to GRADED`,
                        status: 'done',
                    },
                ]);
            }
        };

        socket.on('submission-progress', handleProgress);
        return () => { socket.off('submission-progress', handleProgress); };
    }, [socket, assignmentData]);

    useEffect(() => {
        if (!socket || !watchingSubmissionId) return;

        const rejoin = () => socket.emit('watch-submission', watchingSubmissionId);

        if (socket.connected) rejoin();

        socket.on('connect', rejoin);
        return () => { socket.off('connect', rejoin); };
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
        if (!file) { setErrorMessage('Please select a PDF file.'); return; }
        if (!pin || pin.length !== 4) { setErrorMessage('Please enter the 4-digit access PIN.'); return; }
        setErrorMessage('');

        try {
            const urlResult = await getUploadUrl({ fileName: file.name, type: file.type, assignmentId: assignmentId!, pin }).unwrap() as any;

            setGradingStatus('idle');
            setCompletedScore(null);
            setEvents([
                {
                    id: 'upload_init',
                    step: 'AUTHORIZATION',
                    label: 'Presigned R2 upload URL authorized',
                    status: 'ok',
                },
                {
                    id: 'uploading_r2',
                    step: 'UPLOADING_PDF',
                    label: `Uploading ${file.name} to Cloudflare R2...`,
                    status: 'active',
                },
            ]);
            setRawLogs([
                '> Grading engine ready.',
                `[STATUS] Requesting upload URL for ${file.name}...`,
                '[OK] Presigned R2 URL granted.',
                '[STATUS] Uploading PDF to Cloudflare R2...',
            ]);

            const uploadData = urlResult.data ?? urlResult;
            await performUpload(uploadData);
        } catch (err) {
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
                setErrorMessage('Upload failed. Please try again.');
                return;
            }

            const res = await markSubmission({
                assignmentId: assignmentId!,
                fileKey: uploadData.key,
            }).unwrap();

            const submissionId = res.data?.id;
            if (submissionId) {
                setWatchingSubmissionId(submissionId);
                setGradingStatus('processing');
                setEvents(prev => [
                    ...prev.map(e => e.id === 'uploading_r2' ? { ...e, status: 'ok' as const, label: 'PDF successfully stored in Cloudflare R2' } : e),
                    {
                        id: 'submission_registered',
                        step: 'SUBMISSION_QUEUED',
                        label: `Submission registered [${submissionId.slice(0, 8)}] · job queued on BullMQ`,
                        status: 'ok',
                    },
                ]);
                setRawLogs(prev => [...prev, '[OK] Submission registered.', '[STATUS] Starting grading pipeline...']);
            }
        } catch (err) {
            setErrorMessage(parseApiError(err, 'Upload failed. Please try again.'));
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading || !assignmentData?.data) {
        return (
            <div className="p-12 text-center">
                <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider animate-pulse">Loading assignment...</p>
            </div>
        );
    }

    const assignment = assignmentData.data;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
            <header className="border-b border-border pb-6">
                <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider mb-3">
                    Upload submission
                </p>
                <h1 className="text-heading-lg md:text-heading-xl font-semibold text-text-primary tracking-tight">
                    {assignment.title}
                </h1>
                <p className="text-body-sm text-text-secondary mt-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-muted" />
                    Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'Open'}
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left side: Upload & PIN */}
                <div className="xl:col-span-5 flex flex-col gap-6">
                    {/* Drop zone Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>PDF Submission</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`
                                    relative mt-2 flex flex-col items-center justify-center text-center p-8
                                    border border-dashed border-border rounded-lg bg-surface-raised/40 hover:bg-surface-raised/70
                                    hover:border-accent/40 transition-colors
                                    ${gradingStatus === 'processing' ? 'processing-stripes border-accent/30' : ''}
                                `}
                            >
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={handleFileChange}
                                    accept=".pdf,application/pdf"
                                    disabled={isUploading}
                                />

                                <div className="w-12 h-12 rounded-xl bg-surface-raised border border-border flex items-center justify-center mb-3">
                                    <Upload className="w-5 h-5 text-accent" />
                                </div>

                                {file ? (
                                    <div className="space-y-1">
                                        <p className="text-body-md text-text-primary font-medium">{file.name}</p>
                                        <p className="text-mono-sm text-text-muted">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for submission
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-body-md text-text-primary font-medium mb-1">Click or drag PDF file here</p>
                                        <p className="text-mono-sm text-text-muted">Maximum file size: 10 MB</p>
                                    </>
                                )}

                                {fileError && (
                                    <p className="text-error font-mono text-mono-sm font-medium mt-3">{fileError}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* PIN & Submit Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Verification & Execution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div>
                                <label htmlFor="access-pin" className="text-label-sm uppercase tracking-wider font-medium text-text-muted block mb-2">
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
                                    className="w-full px-4 py-3 pl-[0.5em] border border-border rounded-lg bg-surface-raised font-mono text-2xl tracking-[0.5em] text-center text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                                    disabled={isUploading}
                                    autoComplete="off"
                                />
                                <p className="font-mono text-mono-sm text-text-muted mt-1.5">Ask your teacher for the 4-digit PIN</p>
                            </div>

                            {errorMessage && (
                                <div className="p-3 bg-error-muted border border-error/20 rounded-md">
                                    <p className="text-error text-body-sm font-medium">{errorMessage}</p>
                                </div>
                            )}

                            <Button
                                variant="default"
                                size="lg"
                                onClick={runPipeline}
                                disabled={isUploading || pin.length !== 4 || !file}
                                className="w-full"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                {isUploading ? 'Uploading...' : 'Run Evaluation Pipeline'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: Polished Inspector & Event Stream */}
                <div className="xl:col-span-7 flex flex-col">
                    <div className="rounded-xl border border-border bg-surface shadow-elevated overflow-hidden flex flex-col min-h-[580px]">
                        {/* Title bar matching mockup */}
                        <div className="border-b border-border bg-surface-raised px-4 py-2.5 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
                                </div>
                                <span className="ml-2.5 font-mono text-mono-sm text-text-muted">
                                    grade_assignment · BullMQ worker
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="font-mono text-mono-sm text-text-muted">
                                    {watchingSubmissionId ? `submission_events:${watchingSubmissionId.slice(0, 8)}` : 'submission_events:<id>'}
                                </span>
                                {gradingStatus === 'processing' && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-accent-muted text-accent border border-accent/20">
                                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                                        LIVE
                                    </span>
                                )}
                                {gradingStatus === 'completed' && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-success-muted text-success border border-success/20">
                                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                        DONE
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Two-pane layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] flex-1 min-h-0">
                            {/* Left: Assignment metadata & Rubric */}
                            <aside className="border-b lg:border-b-0 lg:border-r border-border bg-canvas/40 p-5 space-y-4 flex flex-col">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-1">
                                        Assignment
                                    </p>
                                    <p className="text-body-sm font-semibold text-text-primary line-clamp-2">
                                        {assignment.title}
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-3 border-t border-border/60 font-mono text-mono-sm">
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Max score</span>
                                        <span className="text-text-secondary font-medium">{assignment.maxScore ?? 100} pts</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Storage</span>
                                        <span className="text-text-secondary">Cloudflare R2</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Concurrency</span>
                                        <span className="text-text-secondary">1</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Model</span>
                                        <span className="text-text-secondary">Gemini 2.5 Flash</span>
                                    </div>
                                </div>

                                {assignment.rubric?.criteria && Array.isArray(assignment.rubric.criteria) && assignment.rubric.criteria.length > 0 ? (
                                    <div className="pt-3 border-t border-border/60 font-mono text-mono-sm space-y-1.5 flex-1">
                                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
                                            Rubric criteria
                                        </p>
                                        <div className="space-y-2">
                                            {assignment.rubric.criteria.map((c: any, idx: number) => (
                                                <div key={idx} className="flex items-baseline justify-between gap-2 text-text-secondary text-[11px]">
                                                    <span className="truncate" title={c.name}>{c.name}</span>
                                                    <span className="shrink-0 text-text-muted">{c.points} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-3 border-t border-border/60 font-mono text-mono-sm space-y-1.5 flex-1">
                                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                                            Rubric criteria
                                        </p>
                                        <p className="text-[11px] text-text-muted">Standard criteria · {assignment.maxScore ?? 100} pts</p>
                                    </div>
                                )}
                            </aside>

                            {/* Right: Event stream */}
                            <div className="p-5 bg-surface flex flex-col min-h-0 flex-1">
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-body-sm font-medium text-text-primary">
                                            Event stream
                                        </span>
                                        <span className="font-mono text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-surface-raised border border-border/60">
                                            {events.length} {events.length === 1 ? 'event' : 'events'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-mono-sm text-text-muted hidden sm:inline">
                                            Redis Pub/Sub · Socket.io relay
                                        </span>
                                        <div className="flex items-center rounded border border-border bg-canvas p-0.5 font-mono text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('stream')}
                                                className={`px-2 py-0.5 rounded transition-colors ${viewMode === 'stream' ? 'bg-surface text-text-primary font-medium shadow-button' : 'text-text-muted hover:text-text-secondary'}`}
                                            >
                                                Stream
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('raw')}
                                                className={`px-2 py-0.5 rounded transition-colors ${viewMode === 'raw' ? 'bg-surface text-text-primary font-medium shadow-button' : 'text-text-muted hover:text-text-secondary'}`}
                                            >
                                                Raw
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Content pane */}
                                {viewMode === 'stream' ? (
                                    <div className="terminal-window bg-canvas rounded-lg border border-border p-4 font-mono text-mono-sm space-y-2.5 overflow-y-auto flex-1 min-h-[380px] max-h-[560px]">
                                        {events.map((ev, i) => (
                                            <div key={ev.id || i} className="flex items-start gap-3 py-0.5">
                                                <span className="text-text-muted/40 shrink-0 w-5 text-right tabular-nums pt-0.5 select-none">
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                <span
                                                    className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dotColor[ev.status] || 'bg-text-muted'}`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-text-muted text-[10px] uppercase tracking-wider block mb-0.5 font-medium">
                                                            {ev.step}
                                                        </span>
                                                        {ev.status === 'active' && (
                                                            <span className="text-[10px] text-accent font-mono animate-pulse">
                                                                RUNNING
                                                            </span>
                                                        )}
                                                        {ev.status === 'done' && (
                                                            <span className="text-[10px] text-success font-mono">
                                                                OK
                                                            </span>
                                                        )}
                                                        {ev.status === 'failed' && (
                                                            <span className="text-[10px] text-error font-mono">
                                                                FAIL
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p
                                                        className={
                                                            ev.status === "done"
                                                                ? "text-text-primary font-medium"
                                                                : ev.status === "failed"
                                                                    ? "text-error font-medium"
                                                                    : ev.status === "active"
                                                                        ? "text-text-primary"
                                                                        : "text-text-secondary"
                                                        }
                                                    >
                                                        {ev.label}
                                                    </p>

                                                    {ev.progress && ev.progress.total > 0 && (
                                                        <div className="mt-2 w-full max-w-xs space-y-1">
                                                            <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden border border-border/50">
                                                                <div
                                                                    className="h-full bg-accent transition-all duration-300 ease-out"
                                                                    style={{ width: `${Math.min(100, Math.round((ev.progress.current / ev.progress.total) * 100))}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Completion status card */}
                                        {gradingStatus === 'completed' && (
                                            <div className="mt-4 p-4 rounded-lg border border-success/20 bg-success-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                                        <span className="text-body-sm font-semibold text-text-primary">
                                                            Evaluation Complete
                                                        </span>
                                                        {completedScore !== null && (
                                                            <span className="font-mono text-label-sm font-medium px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
                                                                {completedScore} / {assignment.maxScore ?? 100} PTS
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[12px] text-text-secondary">
                                                        Grade and rubric criteria feedback have been recorded to the database.
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

                                        {/* Failed status card */}
                                        {gradingStatus === 'failed' && (
                                            <div className="mt-4 p-4 rounded-lg border border-error/20 bg-error-muted/30 flex items-start gap-3">
                                                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <p className="text-body-sm font-semibold text-error">
                                                        Grading Failed
                                                    </p>
                                                    <p className="text-[12px] text-text-secondary">
                                                        {errorMessage || 'The worker encountered an error during evaluation. Please contact your instructor.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Idle waiting message */}
                                        {gradingStatus === 'idle' && events.length === 1 && (
                                            <div className="pt-3 text-text-muted/40 text-[11px] flex items-center gap-2 border-t border-border/40">
                                                <span className="animate-pulse">_</span>
                                                <span>Awaiting submission and PIN trigger...</span>
                                            </div>
                                        )}

                                        <div ref={terminalEndRef} />
                                    </div>
                                ) : (
                                    /* Raw terminal view fallback */
                                    <div className="terminal-window flex-1 bg-canvas rounded-lg border border-border p-4 font-mono text-mono-sm overflow-y-auto space-y-1.5 min-h-[380px] max-h-[560px]">
                                        {rawLogs.map((log, i) => (
                                            <div
                                                key={i}
                                                className={
                                                    log.startsWith('[ERROR]') || log.includes('FAIL')
                                                        ? 'text-error font-medium'
                                                        : log.startsWith('[SUCCESS]') || log.startsWith('[OK]')
                                                            ? 'text-success font-medium'
                                                            : log.startsWith('[STATUS]')
                                                                ? 'text-text-primary'
                                                                : log.startsWith('[INFO]')
                                                                    ? 'text-text-secondary'
                                                                    : 'text-text-muted'
                                                }
                                            >
                                                {log}
                                            </div>
                                        ))}
                                        <div ref={terminalEndRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentUpload;
