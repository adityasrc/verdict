import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
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
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const { data: assignmentData } = useGetAssignmentQuery(assignmentId || '', { skip: !assignmentId });
    const {
        data: submissionsData,
        isLoading,
        refetch: refetchSubmissions,
    } = useGetAssignmentSubmissionsQuery(assignmentId || '', { skip: !assignmentId });

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
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
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
        } catch { toast.error('Failed to trigger re-evaluation.'); }
    };

    const handleAllowResubmission = async (submissionId: string) => {
        try {
            await allowResubmission({ submissionId }).unwrap();
            toast.success('Submission deleted. Student can now resubmit.');
            setSelectedSubmission(null);
            setConfirmDeleteId(null);
        } catch { toast.error('Failed to allow resubmission.'); }
    };

    const { socket } = useSocket();
    const [gradingProgress, setGradingProgress] = useState<Record<string, { step: string; percent: number; status: 'processing' | 'completed' | 'failed' }>>({});

    useEffect(() => {
        if (!socket || !assignmentId) return;
        const handleGradingProgress = (event: any) => {
            let displayStatus: 'pending' | 'downloading' | 'grading' | 'graded' | 'failed' = 'pending';
            if (event.error) displayStatus = 'failed';
            else if (event.step === 'grading_completed') { displayStatus = 'graded'; refetchSubmissions(); }
            else if (['downloading_pdf', 'pdf_downloaded', 'submission_started'].includes(event.step)) displayStatus = 'downloading';
            else displayStatus = 'grading';

            setGradingProgress((prev) => ({
                ...prev,
                [event.submissionId]: {
                    step: displayStatus,
                    percent: event.percent || 0,
                    status: event.error ? 'failed' : event.step === 'grading_completed' ? 'completed' : 'processing',
                },
            }));
        };

        socket.emit('watch-assignment', assignmentId);
        socket.on('assignment-grading-progress', handleGradingProgress);
        const handleNewSubmission = (event: any) => { if (event.assignmentId === assignmentId) refetchSubmissions(); };
        socket.on('new-submission', handleNewSubmission);

        return () => {
            socket.emit('unwatch-assignment', assignmentId);
            socket.off('assignment-grading-progress', handleGradingProgress);
            socket.off('new-submission', handleNewSubmission);
        };
    }, [socket, assignmentId, refetchSubmissions]);

    return (
        <div className="w-full">
            <header className="mb-12 border-b-[4px] border-on-surface pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl font-black text-on-surface uppercase tracking-tighter leading-none mb-2">
                        {assignment?.title || 'Submissions'}
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant border-l-4 border-primary pl-4 mt-4 uppercase font-bold">
                        {submissions.length} submissions received
                    </p>
                </div>
                {submissions.length > 0 && (
                    <button onClick={handleExportToExcel} className="bg-primary text-on-primary border-[4px] border-on-surface px-6 py-3 font-label-caps text-label-caps uppercase tracking-wide brutal-shadow brutal-button flex items-center gap-2 hover:bg-primary-container">
                        <span className="material-symbols-outlined">download</span> Export Data
                    </button>
                )}
            </header>

            {isLoading ? (
                <div className="text-center py-12 font-label-mono uppercase font-bold">Loading submissions...</div>
            ) : (
                <div className="space-y-6">
                    {submissions.length === 0 ? (
                        <div className="bg-surface border-[4px] border-on-surface p-12 text-center brutal-shadow font-label-mono uppercase font-bold text-on-surface-variant">
                            Zero submissions found.
                        </div>
                    ) : (
                        submissions.map((submission) => (
                            <div key={submission.id} className="bg-surface border-[4px] border-on-surface flex flex-col sm:flex-row justify-between items-start sm:items-stretch gap-0 brutal-shadow transition-all hover:translate-y-1">
                                <div className="p-6 flex-1 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    <div className="w-12 h-12 bg-surface-variant border-[2px] border-on-surface flex items-center justify-center brutal-shadow flex-shrink-0">
                                        <span className="material-symbols-outlined text-on-surface">person</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline-md text-headline-md font-bold uppercase">{submission.student?.name || 'Unknown Student'}</h3>
                                        {submission.studentUniqueId && <span className="font-label-mono text-xs bg-secondary-fixed px-2 py-1 border-[2px] border-on-surface inline-block mt-2 font-bold uppercase">ID: {submission.studentUniqueId}</span>}
                                        <p className="font-label-mono text-[12px] text-on-surface-variant mt-2 uppercase">
                                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="border-t-[4px] sm:border-t-0 sm:border-l-[4px] border-on-surface p-6 flex flex-col justify-center items-end bg-surface-variant min-w-[250px]">
                                    {gradingProgress[submission.id]?.status === 'processing' ? (
                                        <span className="font-label-mono text-primary font-bold uppercase animate-pulse">
                                            [{gradingProgress[submission.id].step || 'Processing'}]
                                        </span>
                                    ) : gradingProgress[submission.id]?.status === 'failed' ? (
                                        <span className="font-label-mono text-error font-bold uppercase">
                                            [Grading Failed]
                                        </span>
                                    ) : (
                                        <span className={`font-label-mono font-bold uppercase px-3 py-1 border-[2px] border-on-surface brutal-shadow ${submission.status === 'GRADED' ? 'bg-secondary text-on-secondary' : submission.status === 'FAILED' ? 'bg-error text-on-error' : 'bg-surface text-on-surface'}`}>
                                            {submission.status === 'GRADED' ? 'Evaluated' : submission.status === 'FAILED' ? 'Failed' : 'Pending'}
                                        </span>
                                    )}
                                    {submission.score !== null && (
                                        <p className="font-headline-md text-headline-md font-black mt-4">
                                            {submission.score}<span className="text-body-md text-on-surface-variant">/{assignment?.maxScore || 100}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-row sm:flex-col border-t-[4px] sm:border-t-0 sm:border-l-[4px] border-on-surface">
                                    <button onClick={() => setSelectedSubmission(submission)} className="flex-1 px-4 py-4 bg-primary text-on-primary font-label-caps uppercase font-bold hover:bg-primary-container border-r-[4px] sm:border-r-0 sm:border-b-[4px] border-on-surface brutal-button">
                                        Inspect
                                    </button>
                                    <button onClick={() => handleReEvaluate(submission.id)} className="flex-1 px-4 py-4 bg-accent-yellow text-on-surface font-label-caps uppercase font-bold hover:bg-yellow-400 border-r-[4px] sm:border-r-0 sm:border-b-[4px] border-on-surface brutal-button">
                                        Re-eval
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(submission.id)} className="flex-1 px-4 py-4 bg-error text-on-error font-label-caps uppercase font-bold hover:bg-red-700 brutal-button">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Inspect Dialog */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-surface border-[4px] border-on-surface text-on-surface brutal-shadow rounded-none">
                    <DialogHeader>
                        <DialogTitle className="font-headline-md text-headline-md font-black uppercase border-b-[4px] border-on-surface pb-2">Submission Details</DialogTitle>
                        <DialogDescription className="font-label-mono text-on-surface-variant uppercase pt-2">
                            Grading results for {selectedSubmission?.student?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-8 mt-6">
                            <div className="flex flex-wrap gap-6">
                                <div className="bg-secondary-fixed border-[4px] border-on-surface p-4 inline-block brutal-shadow">
                                    <h4 className="font-label-caps text-label-caps uppercase font-bold mb-1">Final Verdict</h4>
                                    <div className="font-headline-lg font-black text-on-surface">{selectedSubmission.score}<span className="text-headline-md">/{assignment?.maxScore || 100}</span></div>
                                </div>
                                <div className="flex flex-col gap-2 justify-center">
                                    <button onClick={() => handleReEvaluate(selectedSubmission.id)} className="px-4 py-2 bg-accent-yellow border-[4px] border-on-surface font-label-caps font-bold uppercase brutal-shadow brutal-button text-on-surface hover:bg-yellow-400">
                                        Force Re-evaluation
                                    </button>
                                    <button onClick={() => { setConfirmDeleteId(selectedSubmission.id); setSelectedSubmission(null); }} className="px-4 py-2 bg-error text-on-error border-[4px] border-on-surface font-label-caps font-bold uppercase brutal-shadow brutal-button hover:bg-red-700">
                                        Delete & Allow Resubmission
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-label-caps text-label-caps uppercase font-bold mb-2">AI Feedback</h4>
                                <div className="bg-surface-variant border-[4px] border-on-surface p-6 prose max-w-none text-on-surface brutal-shadow font-body-md">
                                    <ReactMarkdown>{selectedSubmission.feedback || 'No feedback available.'}</ReactMarkdown>
                                </div>
                            </div>
                            
                            <a href={selectedSubmission.publicUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-4 text-center border-[4px] border-on-surface bg-primary text-on-primary font-label-caps font-bold uppercase brutal-shadow brutal-button hover:bg-primary-container">
                                View Submitted PDF
                            </a>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="max-w-md bg-surface border-[4px] border-on-surface text-on-surface brutal-shadow rounded-none">
                    <DialogHeader>
                        <DialogTitle className="font-headline-md font-black uppercase">Delete Submission</DialogTitle>
                        <DialogDescription className="font-body-md">
                            This will permanently delete the submission and allow the student to resubmit. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-4 mt-6">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-surface-variant border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-surface">
                            Cancel
                        </button>
                        <button onClick={() => confirmDeleteId && handleAllowResubmission(confirmDeleteId)} className="flex-1 py-3 bg-error text-on-error border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-red-700">
                            Confirm Delete
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssignmentSubmissions;