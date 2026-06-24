import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
    useVerifyOtpMutation,
} from '../features/assignments/assignmentApi';

const AssignmentUpload: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>();
    const [fileType, setFileType] = useState<string>();
    const [isUploading, setIsUploading] = useState(false);
    const [fileError, setFileError] = useState<string>('');

    const [otp, setOtp] = useState('');
    const [studentUniqueId, setStudentUniqueId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const { socket } = useSocket();
    const [progressLogs, setProgressLogs] = useState<string[]>(['> Grading engine ready.']);
    const [gradingStatus, setGradingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');

    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId || '', { skip: !assignmentId });
    const [markSubmission] = useSubmitAssignmentMutation();

    useEffect(() => {
        if (!socket) return;
        const handleProgress = (event: any) => {
            if (event.error) {
                setGradingStatus('failed');
                setProgressLogs(prev => [...prev, `[ERROR] ${event.error}`]);
                return;
            }
            let logMessage = '';
            switch (event.step) {
                case 'submission_started': logMessage = '[SYS] Initiating execution pipeline...'; break;
                case 'downloading_pdf': logMessage = '[INFO] Acquiring payload...'; break;
                case 'pdf_downloaded': logMessage = '[SUCCESS] Payload secured.'; break;
                case 'parsing_started': logMessage = '[INFO] Parsing document architecture...'; break;
                case 'page_parsed': logMessage = `[INFO] Reading fragment ${event.page}/${event.total_pages}...`; break;
                case 'parsing_completed': logMessage = '[SUCCESS] Structural analysis complete.'; break;
                case 'gemini_started': logMessage = '[SYS] Verdict AI initialized.'; break;
                case 'gemini_processing': logMessage = '[INFO] Synthesizing evaluation matrix...'; break;
                case 'gemini_completed': logMessage = '[SUCCESS] Analysis finalized.'; break;
                case 'grading_completed': 
                    logMessage = `[SUCCESS] Verdict generated. Score: ${event.score}/${event.maxScore || 100}`;
                    setGradingStatus('completed');
                    break;
                default: if (event.step) logMessage = `[INFO] ${event.step}`;
            }
            if (logMessage) setProgressLogs(prev => [...prev, logMessage]);
        };
        socket.on('submission-progress', handleProgress);
        return () => { socket.off('submission-progress', handleProgress); };
    }, [socket]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError('');
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setFileError('Invalid format. PDF required.');
                setFile(null); setFileName(undefined); setFileType(undefined);
                return;
            }
            setFileName(selectedFile.name);
            setFileType(selectedFile.type);
            setFile(selectedFile);
        }
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
        setOtp(value);
    };

    const runPipeline = async () => {
        if (!file) { setErrorMessage('Please upload a file.'); return; }
        if (assignmentData?.data?.requireUniqueId && !studentUniqueId.trim()) {
            setErrorMessage('University ID is mandatory.'); return;
        }
        if (otp.length !== 4) { setErrorMessage('Invalid PIN. Requires 4 digits.'); return; }
        
        setErrorMessage('');
        try {
            if (!assignmentId) return;
            await verifyOtp({ assignmentId, otp }).unwrap();
            const urlData = await getUploadUrl({ fileName: fileName!, type: fileType!, assignmentId }).unwrap() as any;
            await performUpload(urlData.data || urlData);
        } catch (err: any) {
            setErrorMessage(err?.data?.message || err?.error || 'Authorization Failed.');
        }
    };

    const performUpload = async (currentUploadData: { url: string; key: string }) => {
        setIsUploading(true);
        try {
            const uploadSuccess = await new Promise<boolean>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', () => {});
                xhr.addEventListener('load', () => resolve(xhr.status >= 200 && xhr.status < 300));
                xhr.addEventListener('error', () => reject(new Error('Transmission failure')));
                xhr.open('PUT', currentUploadData.url);
                xhr.setRequestHeader('Content-Type', file!.type);
                xhr.send(file);
            });

            if (uploadSuccess && assignmentId) {
                const res = await markSubmission({ assignmentId, otp, studentUniqueId: studentUniqueId || undefined }).unwrap();
                const submissionId = res.data?.id;
                if (socket && submissionId) {
                    setGradingStatus('processing');
                    setProgressLogs(prev => [...prev, '> mounting submission vol...' , '[OK]']);
                    socket.emit('watch-submission', submissionId);
                }
            } else {
                setErrorMessage('Uplink failed. Please retry.');
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Unexpected fault.');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading || !assignmentData?.data) {
        return <div className="p-8 text-center font-label-mono uppercase">Loading...</div>;
    }

    const assignment = assignmentData.data;

    return (
        <div className="w-full">
            <header className="mb-12 border-b-[4px] border-on-surface pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 bg-primary text-on-primary px-3 py-1 border-[2px] border-on-surface font-label-caps text-label-caps uppercase tracking-wider mb-4 brutal-shadow">
                        <span className="material-symbols-outlined text-sm">science</span>
                        {assignment.title}
                    </div>
                    <h2 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl font-black text-on-surface uppercase tracking-tighter leading-none mb-2">Assignment Upload</h2>
                    <p className="font-body-lg text-body-lg text-on-surface-variant border-l-4 border-primary pl-4 mt-4">Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'Open'}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column */}
                <div className="xl:col-span-7 flex flex-col gap-8">
                    <section className="bg-surface border-[2px] border-on-surface p-8 relative">
                        <div className="absolute -top-3 -left-3 bg-secondary text-on-secondary px-4 py-1 border-[2px] border-on-surface font-label-caps text-label-caps uppercase tracking-widest brutal-shadow z-10">
                            Student Submission
                        </div>
                        <div className="mt-4 border-dashed border-[4px] border-on-surface bg-surface-variant p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface transition-colors group relative">
                            <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,application/pdf" disabled={isUploading} />
                            <div className="w-20 h-20 bg-primary border-[4px] border-on-surface rounded-none flex items-center justify-center mb-6 brutal-shadow group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-4xl text-on-primary">upload_file</span>
                            </div>
                            <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">{file ? file.name : 'Drop Code Files Here'}</h3>
                            <p className="font-label-mono text-label-mono text-on-surface-variant">.pdf (Max 10MB)</p>
                            {fileError && <p className="text-error font-bold mt-2">{fileError}</p>}
                        </div>
                    </section>

                    <section className="bg-surface border-[2px] border-on-surface p-8 relative mt-4">
                        <div className="absolute -top-3 -left-3 bg-tertiary text-on-tertiary px-4 py-1 border-[2px] border-on-surface font-label-caps text-label-caps uppercase tracking-widest brutal-shadow z-10">
                            Verification Required
                        </div>
                        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">Enter Session PIN</h3>
                                <p className="font-body-md text-body-md text-on-surface-variant">Confirm student identity before initiating AI evaluation.</p>
                                {assignment.requireUniqueId && (
                                    <input type="text" value={studentUniqueId} onChange={(e) => setStudentUniqueId(e.target.value)} placeholder="University ID" className="mt-4 w-full px-4 py-2 border-[4px] border-on-surface bg-surface font-label-mono uppercase focus:outline-none focus:border-primary brutal-shadow" />
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input className="w-32 h-16 text-center font-headline-md text-headline-md border-[4px] border-on-surface bg-surface focus:bg-primary-fixed focus:outline-none focus:border-primary uppercase brutal-shadow tracking-[0.5em]" maxLength={4} type="text" value={otp} onChange={handleOtpChange} placeholder="••••" />
                            </div>
                        </div>
                        {errorMessage && <div className="mt-4 text-error font-bold font-label-mono uppercase">{errorMessage}</div>}
                        <button onClick={runPipeline} disabled={isUploading || isVerifyingOtp} className="w-full mt-8 bg-on-surface text-surface py-4 font-headline-md text-body-lg uppercase tracking-widest border-[4px] border-on-surface hover:bg-primary hover:text-on-primary transition-colors brutal-shadow-lg brutal-button flex justify-center items-center gap-3">
                            <span className="material-symbols-outlined">play_circle</span>
                            {isUploading ? 'Executing...' : 'Run Evaluation Pipeline'}
                        </button>
                    </section>
                </div>

                {/* Right Column: AI Terminal */}
                <div className="xl:col-span-5 h-full min-h-[600px]">
                    <section className="h-full border-[4px] border-on-surface flex flex-col relative brutal-shadow-lg bg-on-surface overflow-hidden">
                        <div className="bg-primary text-on-primary border-b-[4px] border-on-surface p-3 flex justify-between items-center z-10">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined">terminal</span>
                                <span className="font-label-mono text-label-mono uppercase font-bold tracking-widest">Verdict AI Engine</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 bg-surface border-[2px] border-on-surface"></div>
                                <div className="w-3 h-3 bg-surface border-[2px] border-on-surface"></div>
                                <div className="w-3 h-3 bg-error border-[2px] border-on-surface"></div>
                            </div>
                        </div>
                        <div className="flex-1 p-6 font-label-mono text-label-mono overflow-y-auto terminal-bg flex flex-col gap-2">
                            {progressLogs.map((log, i) => (
                                <div key={i} className={log.includes('[ERROR]') || log.includes('FAIL') ? 'text-error font-bold' : log.includes('WARN') ? 'text-accent-yellow' : 'text-secondary-fixed'}>
                                    {log}
                                </div>
                            ))}
                            {gradingStatus === 'processing' && (
                                <div className="mt-auto pt-8 flex items-center gap-2">
                                    <span className="text-primary-fixed font-bold animate-pulse">_</span>
                                    <span className="text-surface-variant opacity-70">Processing...</span>
                                </div>
                            )}
                            {gradingStatus === 'completed' && (
                                <div className="mt-auto pt-8 flex items-center gap-2">
                                    <span className="text-secondary-fixed font-bold">Execution Finished.</span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AssignmentUpload;