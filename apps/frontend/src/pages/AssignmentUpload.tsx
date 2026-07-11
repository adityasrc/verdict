import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
    useVerifyOtpMutation,
} from '../features/assignments/assignmentApi';
import { parseApiError } from '../lib/errors';

type GradingStatus = 'idle' | 'processing' | 'completed' | 'failed';

const AssignmentUpload: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();

    // File state
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileError, setFileError] = useState('');

    // Form state
    const [otp, setOtp] = useState('');
    const [studentUniqueId, setStudentUniqueId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Terminal / pipeline state
    const [progressLogs, setProgressLogs] = useState<string[]>(['> Grading engine ready.']);
    const [gradingStatus, setGradingStatus] = useState<GradingStatus>('idle');

    // API hooks
    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId ?? '', { skip: !assignmentId });
    const [markSubmission] = useSubmitAssignmentMutation();
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: any) => {
            if (event.error) {
                setGradingStatus('failed');
                setProgressLogs(prev => [...prev, `[ERROR] ${event.error}`]);
                return;
            }

            const stepMessages: Record<string, string> = {
                submission_started:  '[SYS] Pipeline initiated...',
                downloading_pdf:     '[INFO] Downloading submission...',
                pdf_downloaded:      '[OK] Download complete.',
                parsing_started:     '[INFO] Parsing PDF structure...',
                parsing_completed:   '[OK] Parsing complete.',
                gemini_started:      '[SYS] Verdict AI engine started.',
                gemini_processing:   '[INFO] Evaluating against rubric...',
                gemini_completed:    '[OK] Evaluation complete.',
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

    const applyFile = useCallback((f: File) => {
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
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) applyFile(e.target.files[0]);
    };

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop      = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) applyFile(e.dataTransfer.files[0]);
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOtp(e.target.value.replace(/\D/g, '').slice(0, 4));
    };

    const runPipeline = async () => {
        if (!file)                    { setErrorMessage('Please select a PDF file.'); return; }
        if (otp.length !== 4)         { setErrorMessage('Enter the 4-digit session PIN.'); return; }
        if (assignmentData?.data?.requireUniqueId && !studentUniqueId.trim()) {
            setErrorMessage('University ID is required for this assignment.'); return;
        }
        setErrorMessage('');

        try {
            await verifyOtp({ assignmentId: assignmentId!, otp }).unwrap();
            const urlResult = await getUploadUrl({ fileName: file.name, type: file.type, assignmentId: assignmentId!, otp }).unwrap() as any;
            const uploadData = urlResult.data ?? urlResult;
            await performUpload(uploadData);
        } catch (err) {
            setErrorMessage(parseApiError(err, 'Authorization failed. Check your PIN.'));
        }
    };

    const performUpload = async (uploadData: { url: string; key: string }) => {
        setIsUploading(true);
        try {
            // Upload the file directly to S3 via pre-signed URL
            const ok = await new Promise<boolean>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.addEventListener('load',  () => resolve(xhr.status >= 200 && xhr.status < 300));
                xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
                xhr.open('PUT', uploadData.url);
                xhr.setRequestHeader('Content-Type', file!.type);
                xhr.send(file);
            });

            if (!ok) { setErrorMessage('Upload failed. Please try again.'); return; }

            const res = await markSubmission({
                assignmentId: assignmentId!,
                otp,
                studentUniqueId: studentUniqueId.trim() || undefined,
            }).unwrap();

            const submissionId = res.data?.id;
            if (socket && submissionId) {
                setGradingStatus('processing');
                setProgressLogs(prev => [...prev, '[OK] Submission registered.', '[SYS] Starting grading pipeline...']);
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
    const isDisabled = isUploading || isVerifyingOtp;

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
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className={`
                                relative mt-4 flex flex-col items-center justify-center text-center p-12
                                border-[4px] transition-all duration-75
                                ${isDragging
                                    ? 'border-primary bg-primary-fixed'
                                    : 'border-dashed border-on-surface bg-surface-variant hover:bg-surface'
                                }
                                ${gradingStatus === 'processing' ? 'processing-stripes' : ''}
                            `}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".pdf,application/pdf"
                                disabled={isDisabled}
                            />

                            <div className={`w-16 h-16 bg-primary border-[4px] border-on-surface brutal-shadow flex items-center justify-center mb-4 transition-transform duration-75 ${isDragging ? 'scale-125' : ''}`}>
                                <span className="material-symbols-outlined text-3xl text-on-primary">
                                    {isDragging ? 'download' : 'upload_file'}
                                </span>
                            </div>

                            {isDragging ? (
                                <p className="font-headline-md text-primary font-bold uppercase">Drop to attach file</p>
                            ) : file ? (
                                <p className="font-headline-md text-on-surface font-bold">{file.name}</p>
                            ) : (
                                <>
                                    <p className="font-headline-md text-on-surface font-bold mb-1">Drop PDF here</p>
                                    <p className="font-label-mono text-on-surface-variant uppercase text-sm">or click to browse — max 10 MB</p>
                                </>
                            )}

                            {fileError && (
                                <p className="text-error font-bold font-label-mono uppercase mt-3">{fileError}</p>
                            )}
                        </div>
                    </section>

                    {/* Verification */}
                    <section className="bg-surface border-[4px] border-on-surface brutal-shadow p-6 relative">
                        <div className="absolute -top-4 -left-4 bg-accent-yellow text-on-surface px-4 py-1 border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow z-10">
                            Verification
                        </div>

                        <div className="mt-4 space-y-6">
                            {assignment.requireUniqueId && (
                                <div className="space-y-2">
                                    <Label htmlFor="student-id">University ID</Label>
                                    <Input
                                        id="student-id"
                                        type="text"
                                        value={studentUniqueId}
                                        onChange={e => setStudentUniqueId(e.target.value)}
                                        placeholder="Your university student ID"
                                        disabled={isDisabled}
                                    />
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                                <div className="flex-1">
                                    <Label htmlFor="session-pin" className="mb-2">Session PIN</Label>
                                    <p className="font-body-md text-on-surface-variant mt-1">
                                        Enter the 4-digit PIN provided by your teacher.
                                    </p>
                                </div>
                                <input
                                    id="session-pin"
                                    className="w-36 h-16 text-center font-black text-2xl border-[4px] border-on-surface bg-surface focus:bg-primary-fixed focus:outline-none focus:border-primary brutal-shadow tracking-[0.5em] transition-colors duration-75"
                                    maxLength={4}
                                    type="text"
                                    value={otp}
                                    onChange={handleOtpChange}
                                    placeholder="••••"
                                    aria-label="4-digit session PIN"
                                    disabled={isDisabled}
                                />
                            </div>

                            {errorMessage && (
                                <p className="text-error font-bold font-label-mono uppercase">{errorMessage}</p>
                            )}

                            <Button
                                variant="brutal-dark"
                                size="lg"
                                onClick={runPipeline}
                                disabled={isDisabled}
                                className="w-full"
                            >
                                <span className="material-symbols-outlined">play_circle</span>
                                {isUploading ? 'Uploading...' : isVerifyingOtp ? 'Verifying...' : 'Run Evaluation Pipeline'}
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
                                    <span className="text-secondary font-bold">✓ Grading complete.</span>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentUpload;
