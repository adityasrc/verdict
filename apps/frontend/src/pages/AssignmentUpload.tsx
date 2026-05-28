import { AlertCircle, ArrowLeft, CheckCircle, FileText, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MeshBackground from '../components/MeshBackground';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useSocket } from '../context/SocketContext';
import {
    useGetAssignmentQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
    useVerifyOtpMutation,
} from '../features/assignments/assignmentApi';

const AssignmentUpload: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>();
    const [fileType, setFileType] = useState<string>();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileError, setFileError] = useState<string>('');

    // Error Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // OTP Dialog state
    const [showOtpDialog, setShowOtpDialog] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');

    // Unique ID state
    const [studentUniqueId, setStudentUniqueId] = useState('');

    // Collapsible sections
    const [showRubric, setShowRubric] = useState(false);

    // Real-time grading state
    const { socket } = useSocket();
    const [progressLogs, setProgressLogs] = useState<string[]>([]);
    const [progressPercent, setProgressPercent] = useState(0);
    const [gradingStatus, setGradingStatus] = useState<
        'idle' | 'processing' | 'completed' | 'failed'
    >('idle');

    const [getUploadUrl] = useLazyGetUploadUrlQuery();
    const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
    const { data: assignmentData, isLoading } = useGetAssignmentQuery(assignmentId || '', {
        skip: !assignmentId,
    });

    const [markSubmission] = useSubmitAssignmentMutation();

    // Socket listener
    useEffect(() => {
        if (!socket) return;

        const handleProgress = (event: {
            error?: string;
            percent?: number;
            step?: string;
            page?: number;
            total_pages?: number;
            score?: number;
            maxScore?: number;
        }) => {
            if (event.error) {
                setGradingStatus('failed');
                setProgressLogs((prev) => [...prev, `❌ Error: ${event.error}`]);
                return;
            }

            if (event.percent) setProgressPercent(event.percent);

            let logMessage = '';
            switch (event.step) {
                case 'submission_started':
                    logMessage = '🚀 Initiating execution pipeline...';
                    break;
                case 'downloading_pdf':
                    logMessage = '⬇️ Acquiring payload...';
                    break;
                case 'pdf_downloaded':
                    logMessage = '✅ Payload secured.';
                    break;
                case 'parsing_started':
                    logMessage = '📄 Parsing document architecture...';
                    break;
                case 'page_parsed':
                    logMessage = `📄 Reading fragment ${event.page}/${event.total_pages}...`;
                    break;
                case 'parsing_completed':
                    logMessage = '✅ Structural analysis complete.';
                    break;
                case 'gemini_started':
                    logMessage = '🤖 Verdict AI initialized.';
                    break;
                case 'gemini_processing':
                    logMessage = '🧠 Synthesizing evaluation matrix...';
                    break;
                case 'gemini_completed':
                    logMessage = '✨ Analysis finalized.';
                    break;
                case 'grading_completed':
                    logMessage = `🎉 Verdict generated. Score: ${event.score}/${event.maxScore || 100}`;
                    setGradingStatus('completed');
                    break;
                default:
                    if (event.step) logMessage = `ℹ️ ${event.step}`;
            }

            if (logMessage) {
                setProgressLogs((prev) => [...prev, logMessage]);
            }
        };

        socket.on('submission-progress', handleProgress);

        return () => {
            socket.off('submission-progress', handleProgress);
        };
    }, [socket]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError('');
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            if (selectedFile.type !== 'application/pdf') {
                setFileError('Invalid format. PDF required.');
                setFile(null);
                setFileName(undefined);
                setFileType(undefined);
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
        setOtpError('');
    };

    const handleUploadClick = () => {
        if (!file) return;

        if (assignmentData?.data?.requireUniqueId && !studentUniqueId.trim()) {
            setErrorMessage('University ID is mandatory for authorization.');
            setShowErrorDialog(true);
            return;
        }

        setShowOtpDialog(true);
    };

    const handleOtpSubmit = async () => {
        if (otp.length !== 4) {
            setOtpError('Invalid length. Requires 4 digits.');
            return;
        }

        try {
            if (!assignmentId) return;

            await verifyOtp({ assignmentId, otp }).unwrap();

            if (file && fileName && fileType) {
                const urlData = await getUploadUrl({
                    fileName: fileName,
                    type: fileType,
                    assignmentId,
                }).unwrap() as any;

                setShowOtpDialog(false);
                await performUpload(urlData.data || urlData);
            }
        } catch (err: unknown) {
            const apiError = err as { data?: { message?: string }; error?: string; status?: number };
            const backendMessage = apiError?.data?.message || apiError?.error;

            if (backendMessage === 'You can only make One Submission') {
                setShowOtpDialog(false);
                setErrorMessage('Execution denied: Duplicate submission detected.');
                setShowErrorDialog(true);
                return;
            }

            if (apiError?.status === 403 || backendMessage?.toLowerCase() === 'invalid otp') {
                setOtpError('Authorization Failed: Invalid Key.');
            } else {
                setOtpError('System fault. Retry verification.');
            }
        }
    };

    const performUpload = async (currentUploadData: { url: string; key: string }) => {
        if (!file || !currentUploadData) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const uploadSuccess = await new Promise<boolean>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(percent);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Transmission failure')));
                xhr.addEventListener('abort', () => reject(new Error('Transmission aborted')));

                xhr.open('PUT', currentUploadData.url);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.send(file);
            });

            if (uploadSuccess) {
                setUploadProgress(100);

                if (assignmentId) {
                    try {
                        const res = await markSubmission({
                            assignmentId,
                            otp,
                            studentUniqueId: studentUniqueId || undefined,
                        }).unwrap();
                        
                        const submissionId = res.data?.id;

                        if (socket && submissionId) {
                            setGradingStatus('processing');
                            setProgressLogs(['🚀 Payload registered. Engine starting...']);
                            socket.emit('watch-submission', submissionId);
                        }

                        setIsSubmitted(true);
                    } catch (err) {
                        const message =
                            (err as { data?: { message?: string }; message?: string })?.data?.message ||
                            (err as { message?: string })?.message ||
                            'Submission lock active. Cannot overwrite.';
                        setErrorMessage(message);
                        setShowErrorDialog(true);
                    }
                }
            } else {
                setErrorMessage('Uplink failed. Please retry.');
                setShowErrorDialog(true);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unexpected fault during transmission.';
            setErrorMessage(message);
            setShowErrorDialog(true);
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-mono text-sm text-gray-500">
                Syncing assignment parameters...
            </div>
        );
    }

    if (!assignmentData?.data) {
        return (
            <div className="min-h-screen flex items-center justify-center font-mono text-sm text-red-500">
                Target assignment not found or inaccessible.
            </div>
        );
    }

    const assignment = assignmentData.data;

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center px-4 relative overflow-hidden">
                <MeshBackground />
                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-gray-200 dark:border-gray-800">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Execution Confirmed
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Payload secured. Pipeline initiated.
                    </p>

                    {gradingStatus !== 'idle' && (
                        <div className="mt-6 text-left">
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                Engine Telemetry
                            </h3>
                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 mb-4">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                        gradingStatus === 'failed' ? 'bg-red-600' : 'bg-indigo-600'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-[#09090b] p-4 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-600 dark:text-gray-400">
                                {progressLogs.map((log, i) => (
                                    <div key={i} className="mb-1.5">
                                        {log}
                                    </div>
                                ))}
                                {gradingStatus === 'processing' && (
                                    <div className="animate-pulse text-indigo-500">_</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 flex justify-center">
                        <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] pt-24 pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
            <MeshBackground />
            <div className="max-w-3xl mx-auto relative z-10">
                <div className="bg-white dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {assignment.title}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-mono">
                            Deadline:{' '}
                            {assignment.dueDate
                                ? new Date(assignment.dueDate).toLocaleDateString()
                                : 'Open'}
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="mb-8">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                Execution Parameters
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                {assignment.description || 'No specific parameters provided.'}
                            </p>
                        </div>

                        {assignment.rubric && (
                            <div className="mb-8">
                                <button
                                    type="button"
                                    onClick={() => setShowRubric(!showRubric)}
                                    className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 dark:text-white py-3 px-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-transparent dark:border-gray-700/50">
                                    <span>Evaluation Matrix: {assignment.rubric.name} ({assignment.rubric.criteria.reduce((sum: number, c: { points: number }) => sum + c.points, 0)} pts)</span>
                                    <span className="text-gray-500 font-mono text-xs">{showRubric ? '[-]' : '[+]'}</span>
                                </button>
                                {showRubric && (
                                    <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {assignment.rubric.criteria.map(
                                            (criterion: { name: string; description: string; points: number }, index: number) => (
                                                <div
                                                    key={index}
                                                    className="p-4 bg-gray-50 dark:bg-[#09090b] rounded-lg border border-gray-200 dark:border-gray-800">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                            {criterion.name}
                                                        </h4>
                                                        <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-medium rounded-md border border-indigo-200 dark:border-indigo-500/20">
                                                            {criterion.points} pts
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                                        {criterion.description}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {assignment.requireUniqueId && (
                            <div className="mb-6 space-y-2">
                                <Label htmlFor="studentUniqueId">
                                    University ID <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    id="studentUniqueId"
                                    value={studentUniqueId}
                                    onChange={(e) => setStudentUniqueId(e.target.value)}
                                    placeholder="Enter authorization ID"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-all bg-gray-50/50 dark:bg-[#09090b]/50 group">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,application/pdf"
                                    disabled={isUploading}
                                    required
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`flex flex-col items-center justify-center ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                    {file ? (
                                        <>
                                            <FileText className="h-10 w-10 text-indigo-600 dark:text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {file.name}
                                            </span>
                                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1.5">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                            {!isUploading && (
                                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-4 hover:underline">
                                                    Replace Payload
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-10 w-10 text-gray-400 dark:text-gray-600 mb-3 group-hover:-translate-y-1 transition-transform" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                Select Payload
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">
                                                Restricted to PDF format (Max: 10MB)
                                            </span>
                                        </>
                                    )}
                                </label>
                                {fileError && (
                                    <p className="text-xs text-red-500 mt-3 font-medium">{fileError}</p>
                                )}
                            </div>

                            {isUploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-mono text-gray-600 dark:text-gray-400">
                                        <span>Transmitting...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                                        <div
                                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleUploadClick}
                                    disabled={!file || isUploading}
                                    className="gap-2 px-8">
                                    {isUploading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            Execute Upload
                                            <ArrowLeft className="h-4 w-4 rotate-180" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OTP Dialog */}
                <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Authorization Required</DialogTitle>
                            <DialogDescription>
                                Provide the 4-digit execution key to verify your identity.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-6">
                            <div className="flex flex-col gap-3">
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d{4}"
                                    maxLength={4}
                                    value={otp}
                                    onChange={handleOtpChange}
                                    placeholder="••••"
                                    className="text-center text-3xl tracking-[1em] font-mono h-16 bg-gray-50 dark:bg-[#09090b] border-gray-200 dark:border-gray-800 focus-visible:ring-indigo-500"
                                    autoFocus
                                />
                                {otpError && <p className="text-xs font-medium text-red-500 text-center">{otpError}</p>}
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-between">
                            <Button variant="ghost" onClick={() => setShowOtpDialog(false)}>
                                Abort
                            </Button>
                            <Button
                                onClick={handleOtpSubmit}
                                disabled={otp.length !== 4 || isVerifyingOtp}>
                                {isVerifyingOtp ? 'Verifying...' : 'Verify & Execute'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Error Dialog */}
                <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                    <DialogContent className="sm:max-w-md border-red-200 dark:border-red-900/50">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                                Execution Denied
                            </DialogTitle>
                            <DialogDescription className="text-gray-600 dark:text-gray-300">
                                {errorMessage}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="destructive" className="w-full" onClick={() => setShowErrorDialog(false)}>
                                Acknowledge
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default AssignmentUpload;