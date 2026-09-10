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
import { useSocket } from '../context/SocketContext';
import {
    useDeleteSubmissionMutation,
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
    Trash2,
} from 'lucide-react';

interface GradingProgressEvent {
    submissionId: string;
    step: string;
    percent?: number;
    error?: boolean;
    assignmentId?: string;
}

interface SubmissionProgress {
    phase: string;
    progressState: 'processing' | 'completed' | 'failed';
}

const computeProgress = (event: GradingProgressEvent): SubmissionProgress => {
    if (event.error) {
        return { phase: 'failed', progressState: 'failed' };
    }
    if (event.step === 'grading_completed') {
        return { phase: 'graded', progressState: 'completed' };
    }
    if (event.step && ['downloading_pdf', 'pdf_downloaded', 'submission_started'].includes(event.step)) {
        return { phase: 'downloading', progressState: 'processing' };
    }
    return { phase: 'grading', progressState: 'processing' };
};

const getStatusBadge = (submission: Submission) => {
    if (submission.status === 'GRADED') return { variant: 'success' as const, label: 'Graded' };
    if (submission.status === 'EVALUATING') return { variant: 'accent' as const, label: 'Evaluating' };
    if (submission.status === 'FAILED') return { variant: 'destructive' as const, label: 'Failed' };
    return { variant: 'warning' as const, label: 'Pending' };
};

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

    const [reEvaluateSubmission, { isLoading: isReEvaluating }] = useReEvaluateSubmissionMutation();
    const [deleteSubmission, { isLoading: isDeleting }] = useDeleteSubmissionMutation();

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
            toast.success('Re-evaluation queued.');
        } catch (err) {
            toast.error(parseApiError(err, 'Failed to trigger re-evaluation.'));
        }
    };

    const handleDeleteSubmission = async (submissionId: string) => {
        try {
            await deleteSubmission({ submissionId }).unwrap();
            toast.success('Submission deleted. Student can now resubmit.');
            setSelectedSubmission(null);
            setConfirmDeleteId(null);
        } catch (err) {
            toast.error(parseApiError(err, 'Failed to delete submission.'));
        }
    };

    const { socket } = useSocket();
    const [gradingProgress, setGradingProgress] = useState<Record<string, SubmissionProgress>>({});

    useEffect(() => {
        if (!socket || !assignmentId) return;

        const handleGradingProgress = (event: GradingProgressEvent) => {
            if (event.step === 'grading_completed') {
                refetchSubmissions();
            }
            const computed = computeProgress(event);
            setGradingProgress((prev) => ({
                ...prev,
                [event.submissionId]: computed,
            }));
        };

        socket.emit('watch-assignment', assignmentId);
        socket.on('assignment-grading-progress', handleGradingProgress);

        const handleNewSubmission = (event: { assignmentId?: string }) => {
            if (event.assignmentId === assignmentId) refetchSubmissions();
        };
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
            ) : submissions.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-12 md:p-16 text-center bg-surface/30">
                    <p className="text-heading-sm font-medium text-text-muted">No submissions yet</p>
                    <p className="text-body-sm text-text-muted/70 mt-1">
                        Share the assignment link with students to receive submissions.
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-surface divide-y divide-border/60 overflow-hidden">
                    {submissions.map((submission) => {
                        const progress = gradingProgress[submission.id];
                        const badge = getStatusBadge(submission);
                        const isProcessing = progress?.progressState === 'processing';
                        const isFailed = progress?.progressState === 'failed' || submission.status === 'FAILED';

                        return (
                            <div
                                key={submission.id}
                                className="p-5 flex flex-col lg:flex-row gap-5 lg:items-center justify-between card-interactive hover:bg-surface-raised/40 transition-colors"
                            >
                                <div className="flex-1 flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-lg bg-surface-raised border border-border flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-text-muted" />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <h3 className="text-body-sm font-semibold text-text-primary truncate">
                                            {submission.student?.name || 'Unknown Student'}
                                        </h3>
                                        <p className="font-mono text-xs text-text-muted">
                                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:min-w-[260px]">
                                    <div className="flex-1">
                                        {isProcessing ? (
                                            <Badge variant="accent" className="font-mono text-[10px] capitalize">
                                                {progress?.phase || 'Processing'}
                                            </Badge>
                                        ) : isFailed ? (
                                            <Badge variant="destructive" className="font-mono text-[10px]">Failed</Badge>
                                        ) : (
                                            <Badge variant={badge.variant} className="font-mono text-[10px]">{badge.label}</Badge>
                                        )}
                                        {submission.score !== null && submission.score !== undefined && (
                                            <p className="text-body-md font-semibold text-text-primary mt-1.5 font-mono">
                                                {submission.score}<span className="text-xs text-text-muted">/{assignment?.maxScore || 100}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            disabled={isReEvaluating || isDeleting}
                                            onClick={() => setSelectedSubmission(submission)}
                                        >
                                            Inspect
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isReEvaluating || isDeleting}
                                            onClick={() => handleReEvaluate(submission.id)}
                                        >
                                            Re-evaluate
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-text-muted hover:text-error"
                                            disabled={isReEvaluating || isDeleting}
                                            onClick={() => setConfirmDeleteId(submission.id)}
                                            aria-label="Delete submission"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Details</DialogTitle>
                        <DialogDescription>
                            Grading results for {selectedSubmission?.student?.name || 'Student'}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-6 mt-2">
                            <div className="bg-surface-raised border border-border rounded-xl p-5">
                                <h4 className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1.5">
                                    Final Score
                                </h4>
                                <div className="font-mono text-3xl font-semibold text-text-primary">
                                    {selectedSubmission.score !== null && selectedSubmission.score !== undefined
                                        ? selectedSubmission.score
                                        : '—'}
                                    <span className="font-sans text-sm text-text-muted font-normal ml-1.5">
                                        /{assignment?.maxScore || 100} PTS
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
                                    AI Feedback
                                </h4>
                                <div className="bg-surface-raised border border-border rounded-xl p-5 prose prose-invert max-w-none text-text-secondary text-sm">
                                    <ReactMarkdown>
                                        {typeof selectedSubmission.feedback === 'string'
                                            ? selectedSubmission.feedback
                                            : selectedSubmission.feedback
                                                ? (selectedSubmission.feedback as any).feedback || JSON.stringify(selectedSubmission.feedback, null, 2)
                                                : 'No feedback available.'}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={isReEvaluating}
                                    onClick={() => handleReEvaluate(selectedSubmission.id)}
                                >
                                    {isReEvaluating ? 'Re-evaluating…' : 'Force Re-evaluation'}
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={isDeleting}
                                    onClick={() => { setConfirmDeleteId(selectedSubmission.id); setSelectedSubmission(null); }}
                                >
                                    {isDeleting ? 'Deleting…' : 'Delete & Allow Resubmission'}
                                </Button>
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
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={isDeleting}
                            onClick={() => confirmDeleteId && handleDeleteSubmission(confirmDeleteId)}
                        >
                            {isDeleting ? 'Deleting…' : 'Delete & Allow Resubmission'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssignmentSubmissions;
