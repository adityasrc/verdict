import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import RubricManager from './RubricManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useSocket } from '../context/SocketContext';
import {
    useDeleteAssignmentMutation,
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { toast } from 'sonner';
import { CreateAssignmentModal } from './modals/CreateAssignmentModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { CheckCheck, Clock, FileSpreadsheet, Plus, Share2, Sliders, Trash2, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parseApiError } from '../lib/errors';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>{label}</CardTitle>
            <Icon className="h-4 w-4 text-text-muted" />
        </CardHeader>
        <CardContent>
            <span className="text-heading-lg font-semibold block tracking-tight text-text-primary font-mono">{value}</span>
        </CardContent>
    </Card>
);

export const TeacherDashboard: React.FC = () => {
    const user = useAppSelector(selectCurrentUser);
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRubricManagerOpen, setIsRubricManagerOpen] = useState(false);
    const [showAllAssignments, setShowAllAssignments] = useState(false);
    const { socket } = useSocket();

    const [gradingProgress, setGradingProgress] = useState<Record<string, { step: string; percent: number; status: 'processing' | 'completed' | 'failed' }>>({});

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
        const handleGradingProgress = (event: any) => {
            let displayStatus: 'pending' | 'downloading' | 'grading' | 'graded' | 'failed' = 'pending';
            if (event.error) displayStatus = 'failed';
            else if (event.step === 'grading_completed') {
                displayStatus = 'graded';
                refetchSubmissions();
                refetchAssignments();
            } else if (['downloading_pdf', 'pdf_downloaded', 'submission_started'].includes(event.step)) displayStatus = 'downloading';
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
        socket.on('assignment-grading-progress', handleGradingProgress);
        socket.on('new-submission', () => { refetchAssignments(); refetchSubmissions(); });
        return () => {
            socket.off('assignment-grading-progress', handleGradingProgress);
            socket.off('new-submission');
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
        const link = `${window.location.origin}/upload/${assignmentId}`;
        const shareText = accessPin
            ? `Assignment Link: ${link}\nAccess PIN: ${accessPin}`
            : link;
        try { await navigator.clipboard.writeText(shareText); toast.success('Link + PIN copied to clipboard'); }
        catch { window.prompt('Copy this manually:', shareText); }
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

    const pendingCount = recentSubmissions.filter((s) => s.status === 'PENDING').length;
    const gradedCount = recentSubmissions.filter((s) => s.status === 'GRADED').length;
    const gradedSubmissions = recentSubmissions.filter((s) => s.status === 'GRADED' && s.score !== null);
    const avgScore = gradedSubmissions.length > 0
        ? Math.round(gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / gradedSubmissions.length)
        : 0;

    return (
        <div className="w-full">
            <CreateAssignmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOpenRubricManager={() => setIsRubricManagerOpen(true)}
            />

            {isRubricManagerOpen && <RubricManager onClose={() => setIsRubricManagerOpen(false)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-heading-md text-text-primary font-semibold tracking-tight leading-tight">
                        Welcome back, {user?.name || user?.email?.split('@')[0] || 'Educator'}
                    </h2>
                </div>
                <div className="flex gap-3 flex-col sm:flex-row">
                    <Button variant="secondary" onClick={() => setIsRubricManagerOpen(true)}>
                        <Sliders className="h-4 w-4" />
                        Manage Rubrics
                    </Button>
                    <Button variant="default" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                        New Assessment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatCard label="Assessments" value={activeAssignments.length} icon={FileSpreadsheet} />
                <StatCard label="Pending" value={pendingCount} icon={Clock} />
                <StatCard label="Graded" value={gradedCount} icon={CheckCheck} />
                <StatCard label="Avg. Score" value={`${avgScore}%`} icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="flex justify-between items-end border-b border-border pb-3 mb-2">
                        <h3 className="text-heading-sm text-text-primary font-semibold">Active Pipelines</h3>
                    </div>

                    {isAssignmentsLoading ? (
                        <p className="text-body-sm text-text-muted animate-pulse">Loading...</p>
                    ) : activeAssignments.length === 0 ? (
                        <div className="border border-dashed border-border rounded-lg p-12 text-center">
                            <p className="text-heading-sm text-text-muted font-medium mb-2">No active assignments</p>
                            <p className="text-body-sm text-text-muted mb-6">Create one to get started</p>
                            <Button variant="default" onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="h-4 w-4" />
                                New Assessment
                            </Button>
                        </div>
                    ) : (
                        <>
                            {visibleAssignments.map((assignment) => (
                                <div key={assignment.id} className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-strong transition-colors">
                                    <div className="px-5 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-body-md font-semibold text-text-primary">{assignment.title}</h4>
                                            <span className="text-label-sm text-text-secondary bg-surface-raised border border-border px-2 py-0.5 rounded-md font-mono">Active</span>
                                        </div>
                                        <div className="flex justify-between font-mono text-mono-sm text-text-muted mb-4">
                                            <span>Submissions: {assignment._count?.submissions || 0}</span>
                                            <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Open'}</span>
                                        </div>

                                        {assignment.accessPin && (
                                            <div className="bg-canvas border border-border rounded-md px-3.5 py-1.5 mb-4 flex items-center justify-between">
                                                <span className="text-label-sm text-text-muted font-mono">Access PIN</span>
                                                <span className="font-mono text-body-sm font-semibold tracking-[0.25em] text-text-primary">{assignment.accessPin}</span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => navigate(`/assignment/${assignment.id}/submissions`)}
                                            >
                                                Review Submissions
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleShareLink(assignment.id, assignment.accessPin)}
                                                aria-label="Copy share link and PIN"
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-text-muted hover:text-error"
                                                onClick={() => setDeleteAssignmentId(assignment.id)}
                                                aria-label="Delete assessment"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activeAssignments.length > ASSIGNMENTS_PER_PAGE && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowAllAssignments((v) => !v)}
                                    className="w-full"
                                >
                                    {showAllAssignments
                                        ? 'Show Less'
                                        : `View All ${activeAssignments.length} Assignments`}
                                </Button>
                            )}
                        </>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col">
                    <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                        <h3 className="text-heading-sm text-text-primary font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                            Live Output
                        </h3>
                    </div>
                    <div className="terminal-window flex-1 bg-canvas border border-border rounded-lg p-4 font-mono text-mono-sm text-text-muted overflow-y-auto max-h-[480px] min-h-[320px] flex flex-col gap-1.5">
                        <div className="text-text-muted/50 mb-3 border-b border-border pb-3 text-label-sm">
                            Listening for grading activity...
                        </div>
                        {recentSubmissions.slice(0, 10).map((sub) => {
                            const progress = gradingProgress[sub.id];
                            const statusText = progress ? progress.step : sub.status;
                            const isError = progress?.status === 'failed' || sub.status === 'FAILED';
                            const isDone = sub.status === 'GRADED' || progress?.status === 'completed';
                            return (
                                <div key={sub.id} className="flex gap-3 mb-1">
                                    <span className="text-text-muted/40 w-12 flex-shrink-0">
                                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={isError ? 'text-error' : isDone ? 'text-success' : 'text-warning'}>
                                        [{sub.assignment?.title.substring(0, 8)}] {sub.student?.email?.split('@')[0] || 'Unknown'} — {statusText.toUpperCase()}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="flex gap-3 mt-auto pt-3 items-center">
                             <span className="text-text-muted animate-pulse">_</span>
                             <span className="text-text-muted/50">Awaiting next task...</span>
                        </div>
                    </div>
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
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};