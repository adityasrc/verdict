import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { useSocket } from '../context/SocketContext';
import {
    useAllowResubmissionMutation,
    useGetAssignmentQuery,
    useGetAssignmentSubmissionsQuery,
    useReEvaluateSubmissionMutation,
} from '../features/assignments/assignmentApi';
import { parseApiError } from '../lib/errors';
import type { Submission } from '../types';
import { toast } from 'sonner';
import {
    FileCheck,
    Download,
    User,
    Pencil,
    Trash2,
} from 'lucide-react';

const getStatusBadge = (submission: Submission) => {
    if (submission.status === 'GRADED') return { variant: 'success' as const, label: 'Evaluated' };
    if (submission.status === 'EVALUATING') return { variant: 'accent' as const, label: 'Evaluating' };
    if (submission.status === 'FAILED') return { variant: 'destructive' as const, label: 'Failed' };
    return { variant: 'warning' as const, label: 'Pending' };
};

const AssignmentSubmissions: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [manualScore, setManualScore] = useState<string>('');

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
        const headers = ['Name', 'Score'];
        const rows = submissions.map((s) => [
            s.student?.name || 'Unknown',
            s.score !== null && s.score !== undefined ? s.score.toString() : '',
        ]);
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${assignment?.title || 'export'}_grades.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleReEvaluate = async (submissionId: string) => {
        try {
            await reEvaluateSubmission({ submissionId }).unwrap();
            toast.success('Re-evaluation forced.');
        } catch (err) {
            toast.error(parseApiError(err, 'Failed to trigger re-evaluation.'));
        }
    };

    const handleAllowResubmission = async (submissionId: string) => {
        try {
            await allowResubmission({ submissionId }).unwrap();
            toast.success('Submission deleted. Student can now resubmit.');
            setSelectedSubmission(null);
            setConfirmDeleteId(null);
        } catch (err) {
            toast.error(parseApiError(err, 'Failed to allow resubmission.'));
        }
    };

    const handleSaveScore = () => {
        const num = parseFloat(manualScore);
        if (!isNaN(num) && selectedSubmission) {
            setSelectedSubmission({ ...selectedSubmission, score: num });
            toast.info('Score updated for this view.');
        }
        setIsEditingScore(false);
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
            <header className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <Badge variant="outline" className="mb-3 gap-1.5 font-mono text-mono-sm">
                        <FileCheck className="w-3.5 h-3.5" />
                        Submission review
                    </Badge>
                    <h1 className="text-heading-lg md:text-heading-xl font-semibold text-text-primary tracking-tight leading-tight">
                        {assignment?.title || 'Submissions'}
                    </h1>
                    <p className="text-body-sm text-text-secondary mt-3">
                        {submissions.length} submission{submissions.length !== 1 ? 's' : ''} received
                    </p>
                </div>
                {submissions.length > 0 && (
                    <Button variant="secondary" onClick={handleExportToExcel}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                )}
            </header>

            {isLoading ? (
                <div className="text-center py-12 font-mono text-mono-sm text-text-muted uppercase tracking-wider animate-pulse">
                    Loading submissions...
                </div>
            ) : (
                <div className="space-y-4">
                    {submissions.length === 0 ? (
                        <div className="border border-dashed border-border rounded-lg p-12 md:p-16 text-center">
                            <p className="text-heading-lg font-semibold text-text-muted/40 select-none">0</p>
                            <p className="text-heading-sm font-medium text-text-muted mt-2">No submissions yet</p>
                            <p className="text-body-sm text-text-muted mt-2">
                                Share the assignment link for students to submit.
                            </p>
                        </div>
                    ) : (
                        submissions.map((submission) => {
                            const progress = gradingProgress[submission.id];
                            const badge = getStatusBadge(submission);

                            return (
                                <div
                                    key={submission.id}
                                    className="bg-surface border border-border rounded-lg card-glow overflow-hidden hover:border-border-strong transition-colors"
                                >
                                    <div className="p-5 flex flex-col lg:flex-row gap-5 lg:items-center">
                                        <div className="flex-1 flex gap-4 items-start">
                                            <div className="w-11 h-11 rounded-lg bg-surface-raised border border-border flex items-center justify-center flex-shrink-0">
                                                <User className="w-5 h-5 text-text-secondary" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-body-md font-semibold text-text-primary">
                                                    {submission.student?.name || 'Unknown Student'}
                                                </h3>
                                                <p className="font-mono text-mono-sm text-text-muted mt-1">
                                                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:min-w-[260px]">
                                            <div className="flex-1">
                                                {progress?.status === 'processing' ? (
                                                    <Badge variant="accent" className="animate-pulse">
                                                        {progress.step || 'Processing'}
                                                    </Badge>
                                                ) : progress?.status === 'failed' ? (
                                                    <Badge variant="destructive">Grading failed</Badge>
                                                ) : (
                                                    <Badge variant={badge.variant}>{badge.label}</Badge>
                                                )}
                                                {submission.score !== null && submission.score !== undefined && (
                                                    <p className="text-heading-sm font-semibold text-text-primary mt-2">
                                                        {submission.score}<span className="text-body-sm text-text-muted">/{assignment?.maxScore || 100}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedSubmission(submission);
                                                        setManualScore(submission.score !== null && submission.score !== undefined ? submission.score.toString() : '');
                                                        setIsEditingScore(false);
                                                    }}
                                                >
                                                    Inspect
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleReEvaluate(submission.id)}>
                                                    Re-eval
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-text-muted hover:text-error"
                                                    onClick={() => setConfirmDeleteId(submission.id)}
                                                    aria-label="Delete submission"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Details</DialogTitle>
                        <DialogDescription>
                            Grading results for {selectedSubmission?.student?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-8 mt-2">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="bg-surface-raised border border-border rounded-lg p-4 card-glow">
                                    <div className="flex justify-between items-center gap-6 mb-1">
                                        <h4 className="text-label-sm uppercase tracking-wider text-text-muted font-medium">Final Verdict</h4>
                                        <button
                                            onClick={() => {
                                                if (!isEditingScore && selectedSubmission) {
                                                    setManualScore(selectedSubmission.score !== null && selectedSubmission.score !== undefined ? selectedSubmission.score.toString() : '');
                                                }
                                                setIsEditingScore(!isEditingScore);
                                            }}
                                            className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-accent hover:bg-surface transition-colors"
                                            aria-label="Edit score"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {isEditingScore ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Input
                                                type="number"
                                                className="w-24 font-mono text-heading-sm font-semibold"
                                                value={manualScore}
                                                onChange={(e) => setManualScore(e.target.value)}
                                            />
                                            <span className="font-mono text-heading-sm font-semibold text-text-primary">/{assignment?.maxScore || 100}</span>
                                            <Button size="sm" variant="default" onClick={handleSaveScore}>Save</Button>
                                        </div>
                                    ) : (
                                        <div className="font-mono text-heading-lg font-semibold text-text-primary">
                                            {selectedSubmission.score}
                                            <span className="font-sans text-heading-sm text-text-muted font-normal">/{assignment?.maxScore || 100}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 justify-center">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleReEvaluate(selectedSubmission.id)}
                                    >
                                        Force Re-evaluation
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => { setConfirmDeleteId(selectedSubmission.id); setSelectedSubmission(null); }}
                                    >
                                        Delete &amp; Allow Resubmission
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-label-sm uppercase tracking-wider text-text-muted font-medium mb-2">AI Feedback</h4>
                                <div className="bg-surface-raised border border-border rounded-lg p-5 prose prose-invert max-w-none text-text-secondary">
                                    <ReactMarkdown>
                                        {typeof selectedSubmission.feedback === 'string'
                                            ? selectedSubmission.feedback
                                            : selectedSubmission.feedback
                                                ? (selectedSubmission.feedback as any).feedback || JSON.stringify(selectedSubmission.feedback, null, 2)
                                                : 'No feedback available.'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Submission</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the submission and allow the student to resubmit. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setConfirmDeleteId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => confirmDeleteId && handleAllowResubmission(confirmDeleteId)}
                        >
                            Confirm Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssignmentSubmissions;
