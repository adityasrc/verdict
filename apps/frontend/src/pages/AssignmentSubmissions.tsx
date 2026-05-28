import { Download, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import MeshBackground from '../components/MeshBackground';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { useSocket } from '../context/SocketContext';
import {
    useAllowResubmissionMutation,
    useGetAssignmentQuery,
    useGetAssignmentSubmissionsQuery,
    useReEvaluateSubmissionMutation,
} from '../features/assignments/assignmentApi';
import type { Submission } from '../types';
import { toast } from 'sonner';

const AssignmentSubmissions: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

    const { data: assignmentData } = useGetAssignmentQuery(assignmentId || '', {
        skip: !assignmentId,
    });
    const {
        data: submissionsData,
        isLoading,
        refetch: refetchSubmissions,
    } = useGetAssignmentSubmissionsQuery(assignmentId || '', {
        skip: !assignmentId,
    });

    const assignment = assignmentData?.data;
    const submissions = submissionsData?.data || [];

    const [reEvaluateSubmission] = useReEvaluateSubmissionMutation();
    const [allowResubmission] = useAllowResubmissionMutation();

    const handleExportToExcel = () => {
        if (!submissions.length) return;

        const headers = ['ID', 'Name', 'Score'];
        const rows = submissions.map((s) => [
            s.studentUniqueId || '',
            s.student?.name || 'Unknown',
            s.score !== null && s.score !== undefined ? s.score.toString() : '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${assignment?.title || 'telemetry'}_export.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleReEvaluate = async (submissionId: string) => {
        try {
            await reEvaluateSubmission({ submissionId }).unwrap();
            toast.success('Re-evaluation forced.');
        } catch {
            toast.error('Failed to trigger re-evaluation.');
        }
    };

    const handleAllowResubmission = async (submissionId: string) => {
        if (!confirm('Purge this record? This cannot be undone.')) {
            return;
        }
        try {
            await allowResubmission({ submissionId }).unwrap();
            toast.success('Record purged. Candidate cleared for resubmission.');
            setSelectedSubmission(null);
        } catch {
            toast.error('Failed to purge record.');
        }
    };

    const { socket } = useSocket();

    const [gradingProgress, setGradingProgress] = useState<
        Record<
            string,
            {
                step: string;
                percent: number;
                status: 'processing' | 'completed' | 'failed';
            }
        >
    >({});

    useEffect(() => {
        if (!socket || !assignmentId) return;

        const handleGradingProgress = (event: {
            submissionId: string;
            step?: string;
            percent?: number;
            error?: string;
            score?: number;
        }) => {
            let displayStatus: 'pending' | 'downloading' | 'grading' | 'graded' | 'failed' = 'pending';
            if (event.error) {
                displayStatus = 'failed';
            } else if (event.step === 'grading_completed') {
                displayStatus = 'graded';
                refetchSubmissions();
            } else if (
                event.step === 'downloading_pdf' ||
                event.step === 'pdf_downloaded' ||
                event.step === 'submission_started'
            ) {
                displayStatus = 'downloading';
            } else if (
                event.step === 'parsing_started' ||
                event.step === 'page_parsed' ||
                event.step === 'parsing_completed' ||
                event.step === 'gemini_started' ||
                event.step === 'gemini_processing' ||
                event.step === 'gemini_completed'
            ) {
                displayStatus = 'grading';
            }

            setGradingProgress((prev) => ({
                ...prev,
                [event.submissionId]: {
                    step: displayStatus,
                    percent: event.percent || 0,
                    status: event.error
                        ? 'failed'
                        : event.step === 'grading_completed'
                          ? 'completed'
                          : 'processing',
                },
            }));
        };

        socket.emit('watch-assignment', assignmentId);
        socket.on('assignment-grading-progress', handleGradingProgress);

        const handleNewSubmission = (event: { assignmentId: string }) => {
            if (event.assignmentId === assignmentId) {
                refetchSubmissions();
            }
        };

        socket.on('new-submission', handleNewSubmission);

        return () => {
            socket.emit('unwatch-assignment', assignmentId);
            socket.off('assignment-grading-progress', handleGradingProgress);
            socket.off('new-submission', handleNewSubmission);
        };
    }, [socket, assignmentId, refetchSubmissions]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#030712] text-gray-900 dark:text-gray-100 px-4 pt-24 pb-8 relative overflow-hidden">
            <MeshBackground />
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex justify-between items-start mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-1 tracking-tight text-gray-900 dark:text-white">
                            {assignment?.title || 'Execution Records'}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                            {submissions.length} payloads registered
                        </p>
                    </div>
                    {submissions.length > 0 && (
                        <Button 
                            variant="outline" 
                            onClick={handleExportToExcel}
                            className="gap-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-[#09090b]">
                            <Download className="h-4 w-4" />
                            Export Data
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="text-center py-12 font-mono text-gray-500 text-sm">Retrieving telemetry...</div>
                ) : (
                    <div className="space-y-4">
                        {submissions.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 p-8 rounded-2xl text-center border border-gray-200 dark:border-gray-800 backdrop-blur-sm">
                                <p className="text-gray-500 font-mono text-sm">Zero records found.</p>
                            </div>
                        ) : (
                            submissions.map((submission) => (
                                <div
                                    key={submission.id}
                                    className="bg-white dark:bg-gray-900/80 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-sm transition-all hover:border-indigo-500/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gray-100 dark:bg-[#09090b] rounded-full border border-gray-200 dark:border-gray-800">
                                            <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-lg tracking-tight">
                                                    {submission.student?.name || 'Unknown Target'}
                                                </h3>
                                                {submission.studentUniqueId && (
                                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono font-medium rounded-md border border-gray-200 dark:border-gray-700">
                                                        ID: {submission.studentUniqueId}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Logged:{' '}
                                                {new Date(submission.submittedAt).toLocaleDateString()}{' '}
                                                [{new Date(submission.submittedAt).toLocaleTimeString()}]
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="text-right">
                                            {gradingProgress[submission.id]?.status === 'processing' ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 capitalize">
                                                        {gradingProgress[submission.id].step || 'Processing'}
                                                    </span>
                                                </div>
                                            ) : gradingProgress[submission.id]?.status === 'failed' ? (
                                                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50">
                                                    Execution Failed
                                                </span>
                                            ) : (
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                                                        submission.status === 'GRADED'
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                                                            : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/50'
                                                    }`}>
                                                    {submission.status === 'GRADED' ? 'Evaluated' : 'Pending'}
                                                </span>
                                            )}
                                            {submission.score !== null && (
                                                <p className="text-sm font-bold mt-1.5 tracking-tight">
                                                    Score: {submission.score}/{assignment?.maxScore || 100}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <Button 
                                                variant="default" 
                                                size="sm"
                                                onClick={() => setSelectedSubmission(submission)}>
                                                Inspect
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleReEvaluate(submission.id)}
                                                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-500 dark:border-yellow-900/50 dark:hover:bg-yellow-900/20">
                                                Re-eval
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleAllowResubmission(submission.id)}
                                                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-500 dark:border-red-900/50 dark:hover:bg-red-900/20">
                                                Purge
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <Dialog
                open={!!selectedSubmission}
                onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Execution Log</DialogTitle>
                        <DialogDescription>
                            Verdict parameters for {selectedSubmission?.student?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubmission && (
                        <div className="space-y-6 mt-4">
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    Final Verdict
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tighter">
                                        {selectedSubmission.score}
                                    </span>
                                    <span className="text-gray-400 font-mono">/ {assignment?.maxScore || 100}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                                    Execution Controls
                                </h4>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReEvaluate(selectedSubmission.id)}
                                        className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-500 dark:border-yellow-900/50 dark:hover:bg-yellow-900/20">
                                        Force Re-evaluation
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleAllowResubmission(selectedSubmission.id)}>
                                        Purge Record
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    System Analysis
                                </h4>
                                <div className="bg-gray-50 dark:bg-[#09090b] p-5 rounded-xl border border-gray-200 dark:border-gray-800 text-sm prose dark:prose-invert max-w-none">
                                    <ReactMarkdown>
                                        {selectedSubmission.feedback || 'System analysis unavailable.'}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <a
                                href={selectedSubmission.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 text-center border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
                                Access Source Payload
                            </a>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssignmentSubmissions;