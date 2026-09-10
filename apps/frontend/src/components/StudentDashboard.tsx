import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, RefreshCw, Trophy, TrendingUp, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { StatCard } from './StatCard';
import {
    useGetRecentSubmissionsQuery,
    useGetStudentAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { SubmissionFeedbackModal } from './modals/SubmissionFeedbackModal';
import { useAuth } from '../hooks/useAuth';
import type { Submission } from '../types';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

const scoreLabel = (score: number | null | undefined, maxScore = 100) => {
    if (score == null) return 'Graded';
    const pct = maxScore > 0 ? (score / maxScore) * 100 : score;
    if (pct >= 90) return 'Excellent';
    if (pct >= 75) return 'Strong';
    return 'Reviewed';
};

const STATUS_CONFIG = {
    GRADED: { variant: 'success', label: 'Graded' },
    FAILED: { variant: 'destructive', label: 'Failed' },
    EVALUATING: { variant: 'accent', label: 'Evaluating' },
    PENDING: { variant: 'warning', label: 'Pending' },
} as const;

export const StudentDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [showAllPending, setShowAllPending] = useState(false);
    const [showAllSubmissions, setShowAllSubmissions] = useState(false);

    const { data: assignmentsData, isLoading: isAssignmentsLoading } = useGetStudentAssignmentsQuery();
    const { data: submissionsData, isLoading: isSubmissionsLoading } = useGetRecentSubmissionsQuery();

    const isLoading = isAssignmentsLoading || isSubmissionsLoading;
    const allAssignments = assignmentsData?.data || [];
    const recentSubmissions = submissionsData?.data || [];

    const submittedAssignmentIds = new Set(recentSubmissions.map((s) => s.assignmentId));
    const pendingAssignments = allAssignments.filter((a) => !submittedAssignmentIds.has(a.id));

    const totalSubmissions = recentSubmissions.length;
    const gradedSubmissions = recentSubmissions.filter((s) => s.status === 'GRADED' && s.score != null);

    const normalizedScore = (s: Submission) =>
        ((s.score ?? 0) / (s.assignment?.maxScore || 100)) * 100;

    const averageScore = gradedSubmissions.length > 0
        ? Math.round(gradedSubmissions.reduce((acc, s) => acc + normalizedScore(s), 0) / gradedSubmissions.length)
        : 0;

    const highestScore = gradedSubmissions.length > 0
        ? Math.round(Math.max(...gradedSubmissions.map(normalizedScore)))
        : 0;

    const ITEMS_PER_PAGE = 5;
    const visiblePendingAssignments = showAllPending
        ? pendingAssignments
        : pendingAssignments.slice(0, ITEMS_PER_PAGE);
    const visibleRecentSubmissions = showAllSubmissions
        ? recentSubmissions
        : recentSubmissions.slice(0, ITEMS_PER_PAGE);

    if (isLoading) {
        return (
            <div className="w-full space-y-8 animate-pulse">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-36 rounded-xl bg-surface border border-border" />
                    <div className="h-36 rounded-xl bg-surface border border-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="h-24 rounded-xl bg-surface border border-border" />
                    <div className="h-24 rounded-xl bg-surface border border-border" />
                    <div className="h-24 rounded-xl bg-surface border border-border" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">
            <section className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardContent className="p-6 sm:p-7 flex flex-col justify-center h-full">
                            <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider mb-2">
                                Student Workspace
                            </p>
                            <h1 className="text-heading-md text-text-primary font-semibold tracking-tight leading-tight">
                                {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'Student'}
                            </h1>
                            <p className="text-body-sm text-text-secondary mt-2 max-w-xl">
                                {pendingAssignments.length > 0
                                    ? `You have ${pendingAssignments.length} assignment${pendingAssignments.length !== 1 ? 's' : ''} awaiting submission.`
                                    : 'All coursework has been submitted.'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-body-sm font-medium text-text-secondary">
                                Queue Status
                            </CardTitle>
                            {pendingAssignments.length > 0 ? (
                                <RefreshCw className="h-4 w-4 text-text-muted" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                        </CardHeader>
                        <CardContent className="flex flex-col justify-center">
                            <span className="text-xl font-semibold text-text-primary tracking-tight">
                                {pendingAssignments.length === 0 ? 'All caught up' : `${pendingAssignments.length} Pending`}
                            </span>
                            <p className="text-body-sm text-text-secondary mt-1">
                                {pendingAssignments.length === 0 ? 'No open coursework.' : 'Review open work below.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Total Submissions" value={totalSubmissions} icon={Upload} />
                    <StatCard label="Average Score" value={`${averageScore}%`} icon={TrendingUp} />
                    <StatCard label="Highest Score" value={`${highestScore}%`} icon={Trophy} />
                </div>
            </section>

            {pendingAssignments.length > 0 && (
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                        <h2 className="text-body-md font-semibold text-text-primary">
                            Open Assignments
                        </h2>
                        <span className="font-mono text-[11px] text-text-muted">
                            {pendingAssignments.length} available
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-surface divide-y divide-border/60 overflow-hidden">
                        {visiblePendingAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-interactive hover:bg-surface-raised/40 transition-colors"
                            >
                                <div className="min-w-0 space-y-1">
                                    <h3 className="text-body-sm font-semibold text-text-primary truncate">
                                        {assignment.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-text-muted">
                                        <span className="uppercase tracking-wider">
                                            {assignment.dueDate
                                                ? `Due: ${new Date(assignment.dueDate).toLocaleDateString()}`
                                                : 'No due date'}
                                        </span>
                                        {assignment.maxScore && (
                                            <>
                                                <span>·</span>
                                                <span className="uppercase tracking-wider">{assignment.maxScore} pts max</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => navigate(`/upload/${assignment.id}`)}
                                    className="shrink-0"
                                >
                                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                                    Submit PDF
                                </Button>
                            </div>
                        ))}

                        {pendingAssignments.length > ITEMS_PER_PAGE && (
                            <div className="p-3 bg-surface-raised/20 text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllPending((v) => !v)}
                                    className="text-xs text-text-secondary"
                                >
                                    {showAllPending
                                        ? 'Show Less'
                                        : `View All ${pendingAssignments.length} Assignments`}
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                    <h2 className="text-body-md font-semibold text-text-primary">
                        Recent Feedback
                    </h2>
                    <span className="font-mono text-xs text-text-muted">
                        {recentSubmissions.length} records
                    </span>
                </div>

                {recentSubmissions.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl p-10 text-center bg-surface/30">
                        <p className="text-body-sm text-text-muted font-medium mb-1">No feedback yet</p>
                        <p className="text-xs text-text-muted/70">Submit an assignment to receive evaluations and score breakdowns.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visibleRecentSubmissions.map((sub) => {
                                const statusInfo = STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG] || { variant: 'outline' as const, label: sub.status };

                                return (
                                    <Card key={sub.id} className="card-interactive overflow-hidden hover:border-border-strong transition-colors flex flex-col justify-between">
                                        <div>
                                            <div className="border-b border-border px-5 py-3 flex justify-between items-center bg-surface-raised/40">
                                                <span
                                                    className="text-body-sm font-medium text-text-primary truncate pr-3"
                                                    title={sub.assignment?.title}
                                                >
                                                    {sub.assignment?.title || 'Assignment'}
                                                </span>
                                                <Badge variant={statusInfo.variant} className="shrink-0 font-mono text-[10px]">
                                                    {statusInfo.label}
                                                </Badge>
                                            </div>

                                            <CardContent className="p-5">
                                                {sub.status === 'GRADED' ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-baseline gap-1 font-mono">
                                                            <span className="text-3xl font-semibold text-text-primary tracking-tight">
                                                                {sub.score}
                                                            </span>
                                                            <span className="text-body-sm text-text-muted">
                                                                /{sub.assignment?.maxScore || 100} PTS
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-text-secondary">
                                                            Rating: <strong className="text-text-primary">{scoreLabel(sub.score, sub.assignment?.maxScore)}</strong>
                                                        </p>
                                                    </div>
                                                ) : sub.status === 'FAILED' ? (
                                                    <div className="space-y-1 py-1">
                                                        <p className="text-error text-body-sm font-medium">Evaluation failed</p>
                                                        <p className="text-xs text-text-secondary">Please contact your teacher to reopen this assignment.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 py-1">
                                                        <p className="text-accent text-body-sm font-medium">
                                                            {sub.status === 'EVALUATING' ? 'AI evaluation in progress' : 'Queued for evaluation'}
                                                        </p>
                                                        <p className="text-xs text-text-secondary">Feedback will be available once grading finishes.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </div>

                                        <div className="px-5 py-3 border-t border-border/50 flex justify-between items-center bg-surface/30">
                                            <span className="font-mono text-xs text-text-muted">
                                                {new Date(sub.submittedAt).toLocaleDateString()}
                                            </span>
                                            {sub.status === 'GRADED' && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setSelectedSubmission(sub)}
                                                    className="text-xs"
                                                >
                                                    View Breakdown
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {recentSubmissions.length > ITEMS_PER_PAGE && (
                            <div className="text-center pt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllSubmissions((v) => !v)}
                                    className="text-xs text-text-secondary"
                                >
                                    {showAllSubmissions
                                        ? 'Show Less'
                                        : `View All ${recentSubmissions.length} Records`}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <SubmissionFeedbackModal
                submission={selectedSubmission}
                onClose={() => setSelectedSubmission(null)}
            />
        </div>
    );
};

export default StudentDashboard;
