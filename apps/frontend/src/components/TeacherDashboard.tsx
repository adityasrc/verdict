import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RubricManager from './RubricManager';
import { Button } from './ui/button';
import { StatCard } from './StatCard';
import { AssignmentCard } from './AssignmentCard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useSocket } from '../context/SocketContext';
import {
    useDeleteAssignmentMutation,
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { CreateAssignmentModal } from './modals/CreateAssignmentModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { CheckCheck, Clock, FileSpreadsheet, Plus, Sliders, TrendingUp } from 'lucide-react';
import { parseApiError } from '../lib/errors';

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

export const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRubricManagerOpen, setIsRubricManagerOpen] = useState(false);
    const [showAllAssignments, setShowAllAssignments] = useState(false);
    const { socket } = useSocket();

    const [gradingProgress, setGradingProgress] = useState<Record<string, SubmissionProgress>>({});

    const { data: assignmentsData, isLoading: isAssignmentsLoading, refetch: refetchAssignments } = useGetTeacherAssignmentsQuery();
    const { data: submissionsData, refetch: refetchSubmissions } = useGetRecentSubmissionsQuery();

    const activeAssignments = useMemo(() => assignmentsData?.data || [], [assignmentsData?.data]);
    const recentSubmissions = submissionsData?.data || [];

    const ASSIGNMENTS_PER_PAGE = 5;
    const visibleAssignments = showAllAssignments
        ? activeAssignments
        : activeAssignments.slice(0, ASSIGNMENTS_PER_PAGE);

    useEffect(() => {
        if (!socket) return;

        const handleGradingProgress = (event: GradingProgressEvent) => {
            if (event.step === 'grading_completed') {
                refetchSubmissions();
                refetchAssignments();
            }

            const computed = computeProgress(event);
            setGradingProgress((prev) => ({
                ...prev,
                [event.submissionId]: computed,
            }));
        };

        const handleNewSubmission = () => {
            refetchAssignments();
            refetchSubmissions();
        };

        socket.on('assignment-grading-progress', handleGradingProgress);
        socket.on('new-submission', handleNewSubmission);

        return () => {
            socket.off('assignment-grading-progress', handleGradingProgress);
            socket.off('new-submission', handleNewSubmission);
        };
    }, [socket, refetchAssignments, refetchSubmissions]);

    useEffect(() => {
        if (!socket || !activeAssignments.length) return;
        activeAssignments.forEach((a) => socket.emit('watch-assignment', a.id));
        return () => activeAssignments.forEach((a) => socket.emit('unwatch-assignment', a.id));
    }, [socket, activeAssignments]);

    const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);
    const [deleteAssignment, { isLoading: isDeleting }] = useDeleteAssignmentMutation();

    const handleShareLink = async (assignmentId: string, accessPin?: string | null) => {
        const link = accessPin
            ? `${window.location.origin}/upload/${assignmentId}?pin=${accessPin}`
            : `${window.location.origin}/upload/${assignmentId}`;
        try {
            await navigator.clipboard.writeText(link);
            if (accessPin) {
                toast.success(`Share link copied! Access PIN: ${accessPin}`);
            } else {
                toast.success('Assignment link copied to clipboard');
            }
        } catch {
            window.prompt('Copy assignment link:', link);
        }
    };

    const handleDeleteAssignment = async () => {
        if (!deleteAssignmentId) return;
        try {
            await deleteAssignment(deleteAssignmentId).unwrap();
            toast.success('Assignment deleted successfully');
            setDeleteAssignmentId(null);
        } catch (err) {
            toast.error(parseApiError(err, 'Failed to delete assignment'));
        }
    };

    const pendingCount = recentSubmissions.filter((s) => s.status === 'PENDING' || s.status === 'EVALUATING').length;
    const gradedCount = recentSubmissions.filter((s) => s.status === 'GRADED').length;
    const gradedSubmissions = recentSubmissions.filter((s) => s.status === 'GRADED' && s.score !== null && s.score !== undefined);

    const avgScore = gradedSubmissions.length > 0
        ? Math.round(
            gradedSubmissions.reduce((acc, s) => {
                const max = s.assignment?.maxScore && s.assignment.maxScore > 0 ? s.assignment.maxScore : 100;
                return acc + ((s.score ?? 0) / max) * 100;
            }, 0) / gradedSubmissions.length
        )
        : 0;

    return (
        <div className="w-full space-y-8">
            <CreateAssignmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOpenRubricManager={() => setIsRubricManagerOpen(true)}
            />

            {isRubricManagerOpen && <RubricManager onClose={() => setIsRubricManagerOpen(false)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-border/60">
                <div>
                    <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider mb-1">
                        Teacher Workspace
                    </p>
                    <h1 className="text-heading-md text-text-primary font-semibold tracking-tight leading-tight">
                        Welcome back, {user?.name || user?.email?.split('@')[0] || 'Educator'}
                    </h1>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Button variant="secondary" onClick={() => setIsRubricManagerOpen(true)}>
                        <Sliders className="h-4 w-4 mr-1.5" />
                        Manage Rubrics
                    </Button>
                    <Button variant="default" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Assessment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Assessments" value={activeAssignments.length} icon={FileSpreadsheet} />
                <StatCard label="In Queue" value={pendingCount} icon={Clock} />
                <StatCard label="Graded" value={gradedCount} icon={CheckCheck} />
                <StatCard label="Average Score" value={`${avgScore}%`} icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                        <h2 className="text-body-md font-semibold text-text-primary">
                            Active Assessments
                        </h2>
                        <span className="font-mono text-[11px] text-text-muted">
                            {activeAssignments.length} total
                        </span>
                    </div>

                    {isAssignmentsLoading ? (
                        <p className="text-body-sm text-text-muted animate-pulse py-4">Loading assessments…</p>
                    ) : activeAssignments.length === 0 ? (
                        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-surface/40">
                            <p className="text-body-md text-text-primary font-medium mb-1">No active assessments</p>
                            <p className="text-body-sm text-text-muted mb-5">Create your first assignment to begin receiving submissions.</p>
                            <Button variant="default" size="default" onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-1.5" />
                                New Assessment
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border bg-surface divide-y divide-border/60 overflow-hidden">
                            {visibleAssignments.map((assignment) => (
                                <AssignmentCard
                                    key={assignment.id}
                                    assignment={assignment}
                                    onShare={handleShareLink}
                                    onDelete={(id) => setDeleteAssignmentId(id)}
                                    onReview={(id) => navigate(`/assignment/${id}/submissions`)}
                                />
                            ))}

                            {activeAssignments.length > ASSIGNMENTS_PER_PAGE && (
                                <div className="p-3 bg-surface-raised/20 text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAllAssignments((v) => !v)}
                                        className="text-xs text-text-secondary"
                                    >
                                        {showAllAssignments
                                            ? 'Show Less'
                                            : `View All ${activeAssignments.length} Assessments`}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                        <h2 className="text-body-md font-semibold text-text-primary">
                            Grading Activity
                        </h2>
                        <span className="font-mono text-[11px] text-text-muted">
                            Real-time
                        </span>
                    </div>

                    <Card className="flex-1 flex flex-col min-h-[320px] max-h-[480px]">
                        <CardHeader className="pb-3 border-b border-border">
                            <CardTitle className="text-label-sm font-medium text-text-secondary">
                                Recent Submissions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex-1 overflow-y-auto divide-y divide-border/40">
                            {recentSubmissions.length === 0 ? (
                                <p className="text-body-sm text-text-muted text-center py-8">
                                    No grading activity recorded yet.
                                </p>
                            ) : (
                                recentSubmissions.slice(0, 10).map((sub) => {
                                    const progress = gradingProgress[sub.id];
                                    const statusText = progress ? progress.phase : sub.status.toLowerCase();
                                    const isError = progress?.progressState === 'failed' || sub.status === 'FAILED';
                                    const isDone = sub.status === 'GRADED' || progress?.progressState === 'completed';
                                    const rawTitle = sub.assignment?.title || 'Assignment';
                                    const displayTitle = rawTitle.length > 8 ? `${rawTitle.slice(0, 8)}…` : rawTitle;

                                    return (
                                        <div key={sub.id} className="py-2.5 flex items-baseline justify-between gap-3 text-body-sm">
                                            <div className="min-w-0 space-y-0.5">
                                                <p
                                                    className="font-medium text-text-primary text-xs truncate max-w-[150px]"
                                                    title={rawTitle}
                                                >
                                                    {displayTitle}
                                                </p>
                                                <p className="font-mono text-xs text-text-muted">
                                                    {sub.student?.email?.split('@')[0] || 'Student'}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span
                                                    className={`font-mono text-xs uppercase tracking-wider block font-medium ${
                                                        isError
                                                            ? 'text-error'
                                                            : isDone
                                                                ? 'text-success'
                                                                : 'text-text-secondary'
                                                    }`}
                                                >
                                                    {statusText}
                                                </span>
                                                <span className="font-mono text-xs text-text-muted/60 block">
                                                    {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Assessment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this assignment? All associated student submissions and grading results will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setDeleteAssignmentId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={isDeleting}
                            onClick={handleDeleteAssignment}
                        >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherDashboard;