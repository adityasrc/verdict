import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
} from '../features/assignments/assignmentApi';
import { parseApiError } from '../lib/errors';


type GradingStatus = 'idle' | 'processing' | 'completed' | 'failed';

const AssignmentUpload = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const terminalEndRef = useRef<HTMLDivElement>(null);

    // File state
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');

    // PIN state
    const [pin, setPin] = useState('');

    // Form state
    const [errorMessage, setErrorMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Pipeline state
    const [progressLogs, setProgressLogs] = useState<string[]>(['> Grading engine ready.']);
    const [gradingStatus, setGradingStatus] = useState<GradingStatus>('idle');


    const [watchingSubmissionId, setWatchingSubmissionId] = useState<string | null>(null);

    // API hooks
    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId ?? '', { skip: !assignmentId });
    const [markSubmission] = useSubmitAssignmentMutation();
    const { socket } = useSocket();

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [progressLogs]);

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: any) => {
            if (event.error) {
                setGradingStatus('failed');
                setProgressLogs(prev => [...prev, `[ERROR] ${event.error}`]);
                return;
            }

            const stepMessages: Record<string, string> = {
                submission_started: '[STATUS] Pipeline initiated...',
                downloading_pdf: '[INFO] Downloading submission...',
                pdf_downloaded: '[OK] Download complete.',
                parsing_started: '[INFO] Parsing PDF structure...',
                parsing_completed: '[OK] Parsing complete.',
                gemini_started: '[STATUS] Verdict AI engine started.',
                gemini_processing: '[INFO] Evaluating against rubric...',
                gemini_completed: '[OK] Evaluation complete.',
            };

            if (event.step === 'page_parsed') {
                setProgressLogs(prev => [...prev, `[INFO] Page ${event.page}/${event.total_pages} read.`]);
            } else if (event.step === 'grading_completed') {
                setProgressLogs(prev => [...prev, `[SUCCESS] Score: ${event.score}/${event.maxScore ?? 100}`]);
                setGradingStatus('completed');
            } else if (stepMessages[event.step]) {
                setProgressLogs(prev => [...prev, stepMessages[event.step]]);
            }
        };

        socket.on('submission-progress', handleProgress);
        return () => { socket.off('submission-progress', handleProgress); };
    }, [socket]);

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
            setProgressLogs(['> Grading engine ready.', '[STATUS] Uploading PDF to Cloudflare R2...']);

            const uploadData = urlResult.data ?? urlResult;
            await performUpload(uploadData);
        } catch (err) {
            setErrorMessage(parseApiError(err, 'Failed to start upload.'));
        }
    };

    const performUpload = async (uploadData: { url: string; key: string }) => {
        setIsUploading(true);
        try {
            // Upload PDF directly to Cloudflare R2 via presigned URL
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
            if (socket && submissionId) {
                setWatchingSubmissionId(submissionId);
                setGradingStatus('processing');
                setProgressLogs(prev => [...prev, '[OK] Submission registered.', '[STATUS] Starting grading pipeline...']);
                socket.emit('watch-submission', submissionId);
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
                <p className="font-label-mono uppercase font-bold animate-pulse">Loading assignment...</p>
            </div>
        );
    }

    const assignment = assignmentData.data;

    return (
        <div className="w-full">

            <header className="mb-10 border-b-[4px] border-on-surface pb-6">
                <div className="inline-flex items-center gap-2 bg-primary text-on-primary px-3 py-1 border-[2px] border-on-surface font-label-caps text-label-caps uppercase brutal-shadow mb-4">
                    <span className="material-symbols-outlined text-sm">science</span>
                    {assignment.title}
                </div>
                <h1 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl font-black text-on-surface uppercase tracking-tighter leading-none">
                    Assignment Upload
                </h1>
                <p className="font-body-lg text-on-surface-variant border-l-4 border-primary pl-4 mt-4">
                    Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'Open'}
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                <div className="xl:col-span-7 flex flex-col gap-6">

                    {/* Drop zone */}
                    <section className="bg-surface border-[4px] border-on-surface brutal-shadow p-6 relative">
                        <div className="absolute -top-4 -left-4 bg-secondary text-on-secondary px-4 py-1 border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow z-10">
                            PDF Upload
                        </div>

                        <div
                            className={`
                                relative mt-4 flex flex-col items-center justify-center text-center p-12
                                border-[4px] border-dashed border-on-surface bg-surface-variant hover:bg-surface transition-all duration-75
                                ${gradingStatus === 'processing' ? 'processing-stripes' : ''}
                            `}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".pdf,application/pdf"
                                disabled={isUploading}
                            />

                            <div className="w-16 h-16 bg-primary border-[4px] border-on-surface brutal-shadow flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-on-primary">upload_file</span>
                            </div>

                            {file ? (
                                <p className="font-headline-md text-on-surface font-bold">{file.name}</p>
                            ) : (
                                <>
                                    <p className="font-headline-md text-on-surface font-bold mb-1">Click to select PDF</p>
                                    <p className="font-label-mono text-on-surface-variant uppercase text-sm">max 10 MB</p>
                                </>
                            )}

                            {fileError && (
                                <p className="text-error font-bold font-label-mono uppercase mt-3">{fileError}</p>
                            )}
                        </div>
                    </section>

                    {/* Submit section */}
                    <section className="bg-surface border-[4px] border-on-surface brutal-shadow p-6 relative">
                        <div className="absolute -top-4 -left-4 bg-accent-yellow text-on-surface px-4 py-1 border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow z-10">
                            Submit
                        </div>

                        <div className="mt-4 space-y-4">
                            {/* PIN input */}
                            <div>
                                <label htmlFor="access-pin" className="font-label-caps text-[11px] uppercase tracking-widest font-bold text-on-surface-variant block mb-2">
                                    Access PIN
                                </label>
                                <input
                                    id="access-pin"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="w-full px-4 py-3 border-[4px] border-on-surface bg-surface font-label-mono text-2xl tracking-[0.5em] text-center focus:outline-none focus:border-primary brutal-shadow"
                                    disabled={isUploading}
                                    autoComplete="off"
                                />
                                <p className="font-label-mono text-[11px] text-on-surface-variant uppercase mt-1">Ask your teacher for the 4-digit PIN</p>
                            </div>

                            {errorMessage && (
                                <p className="text-error font-bold font-label-mono uppercase">{errorMessage}</p>
                            )}

                            <Button
                                variant="brutal-dark"
                                size="lg"
                                onClick={runPipeline}
                                disabled={isUploading || pin.length !== 4}
                                className="w-full"
                            >
                                <span className="material-symbols-outlined">play_circle</span>
                                {isUploading ? 'Uploading...' : 'Run Evaluation Pipeline'}
                            </Button>
                        </div>
                    </section>
                </div>

                <div className="xl:col-span-5">
                    <div className="border-[4px] border-on-surface brutal-shadow flex flex-col h-full min-h-[520px] overflow-hidden">
                        {/* Title bar */}
                        <div className="bg-primary text-on-primary border-b-[4px] border-on-surface px-4 py-3 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">terminal</span>
                                <span className="font-label-mono uppercase font-bold tracking-widest text-sm">
                                    Verdict AI Engine
                                </span>
                            </div>
                            {/* Fake window buttons */}
                            <div className="flex gap-2">
                                <div className="w-3 h-3 border-[2px] border-on-primary opacity-50" />
                                <div className="w-3 h-3 border-[2px] border-on-primary opacity-50" />
                                <div className="w-3 h-3 bg-error border-[2px] border-on-surface" />
                            </div>
                        </div>

                        {/* Log output */}
                        <div className="terminal-window flex-1 bg-on-surface p-5 font-label-mono text-secondary overflow-y-auto flex flex-col gap-1.5 text-sm">
                            {progressLogs.map((log, i) => (
                                <div
                                    key={i}
                                    className={
                                        log.startsWith('[ERROR]') || log.includes('FAIL')
                                            ? 'text-error font-bold'
                                            : log.startsWith('[SUCCESS]') || log.startsWith('[OK]')
                                                ? 'text-secondary'
                                                : log.startsWith('[SYS]')
                                                    ? 'text-accent-yellow'
                                                    : 'text-surface/60'
                                    }
                                >
                                    {log}
                                </div>
                            ))}

                            {/* Cursor / status at bottom */}
                            <div className="mt-auto pt-6 flex items-center gap-2">
                                {gradingStatus === 'processing' && (
                                    <>
                                        <span className="text-secondary animate-pulse font-bold">_</span>
                                        <span className="text-surface/60">Processing...</span>
                                    </>
                                )}
                                {gradingStatus === 'completed' && (
                                    <div className="flex flex-col gap-3 w-full">
                                        <span className="text-secondary font-bold">✓ Grading complete.</span>
                                        <Button variant="brutal" size="sm" className="w-fit mt-2" onClick={() => navigate('/dashboard')}>
                                            View Feedback
                                        </Button>
                                    </div>
                                )}
                                {gradingStatus === 'failed' && (
                                    <span className="text-error font-bold">✗ Grading failed. Contact your teacher.</span>
                                )}
                                {gradingStatus === 'idle' && (
                                    <>
                                        <span className="text-surface/60 animate-pulse">_</span>
                                        <span className="text-surface/60">Awaiting pipeline trigger...</span>
                                    </>
                                )}
                            </div>
                            <div ref={terminalEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentUpload;
