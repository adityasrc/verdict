import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, GraduationCap, RefreshCw, Trophy, TrendingUp, Upload } from 'lucide-react';
import { useAppSelector } from '../app/store';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
    useGetRecentSubmissionsQuery,
    useGetStudentAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { SubmissionFeedbackModal } from './modals/SubmissionFeedbackModal';
import { selectCurrentUser } from '../features/auth/authSlice';
import type { Submission } from '../types';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

const scoreLabel = (score: number | null | undefined) => {
    if (score == null) return 'Graded';
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Strong';
    return 'Reviewed';
};

export const StudentDashboard = () => {
    const user = useAppSelector(selectCurrentUser);
    const navigate = useNavigate();
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

    const { data: assignmentsData, isLoading: isAssignmentsLoading } = useGetStudentAssignmentsQuery();
    const { data: submissionsData, isLoading: isSubmissionsLoading } = useGetRecentSubmissionsQuery();

    const isLoading = isAssignmentsLoading || isSubmissionsLoading;
    const allAssignments = assignmentsData?.data || [];
    const recentSubmissions = submissionsData?.data || [];

    const submittedAssignmentIds = new Set(recentSubmissions.map((s) => s.assignmentId));
    const pendingAssignments = allAssignments.filter((a) => !submittedAssignmentIds.has(a.id));

    const totalSubmissions = recentSubmissions.length;
    const gradedSubmissions = recentSubmissions.filter((s) => s.status === 'GRADED' && s.score != null);
    const averageScore = gradedSubmissions.length > 0
        ? Math.round(gradedSubmissions.reduce((acc, s) => acc + (s.score ?? 0), 0) / gradedSubmissions.length)
        : 0;
    const highestScore = gradedSubmissions.length > 0
        ? Math.max(...gradedSubmissions.map((s) => s.score ?? 0))
        : 0;

    if (isLoading) {
        return (
            <div className="w-full space-y-8 animate-pulse">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-44 rounded-lg bg-surface border border-border" />
                    <div className="h-44 rounded-lg bg-surface border border-border" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-28 rounded-lg bg-surface border border-border" />
                    <div className="h-28 rounded-lg bg-surface border border-border" />
                    <div className="h-28 rounded-lg bg-surface border border-border" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <section className="mb-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <Card className="lg:col-span-2 justify-center">
                        <CardContent className="p-6 md:p-8">
                            <Badge variant="default" className="mb-4 gap-1.5 font-mono text-label-sm">
                                <GraduationCap className="h-3.5 w-3.5 text-text-secondary" />
                                Student Workspace
                            </Badge>
                            <h2 className="text-heading-md text-text-primary font-semibold tracking-tight leading-tight">
                                {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'Student'}
                            </h2>
                            <p className="text-body-md text-text-secondary mt-3 max-w-xl">
                                {pendingAssignments.length > 0
                                    ? `You have ${pendingAssignments.length} assignment${pendingAssignments.length !== 1 ? 's' : ''} ready for submission.`
                                    : 'All assignments are submitted.'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="justify-center">
                        <CardHeader>
                            <CardTitle>Queue Status</CardTitle>
                            {pendingAssignments.length > 0 ? (
                                <RefreshCw className="h-4 w-4 text-text-muted" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                            )}
                        </CardHeader>
                        <CardContent className="flex flex-col justify-center">
                            <div className="text-heading-md font-semibold text-text-primary">
                                {pendingAssignments.length === 0 ? 'All caught up' : 'Submissions pending'}
                            </div>
                            <p className="text-body-sm text-text-secondary mt-2">
                                {pendingAssignments.length === 0 ? 'No open work in the queue.' : 'Open assignments are waiting below.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Total Submissions</CardTitle>
                            <Upload className="h-4 w-4 text-text-muted" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-heading-lg font-semibold text-text-primary tracking-tight font-mono">{totalSubmissions}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Average Score</CardTitle>
                            <TrendingUp className="h-4 w-4 text-text-muted" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-heading-lg font-semibold text-text-primary tracking-tight font-mono">{averageScore}%</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Highest Score</CardTitle>
                            <Trophy className="h-4 w-4 text-text-muted" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-heading-lg font-semibold text-text-primary tracking-tight font-mono">{highestScore}%</span>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {pendingAssignments.length > 0 && (
                <section className="mb-10">
                    <div className="flex justify-between items-end border-b border-border pb-3 mb-4">
                        <h3 className="text-heading-sm text-text-primary font-semibold">Open Assignments</h3>
                    </div>
                    <div className="space-y-3">
                        {pendingAssignments.map((assignment) => (
                            <div
                                key={assignment.id}
                                className="bg-surface border border-border rounded-lg card-glow p-5 flex flex-col sm:flex-row justify-between gap-4 sm:items-center hover:border-border-strong transition-colors"
                            >
                                <div>
                                    <p className="text-body-md font-semibold text-text-primary">{assignment.title}</p>
                                    <p className="font-mono text-mono-sm text-text-muted mt-1">
                                        {assignment.dueDate
                                            ? `Due: ${new Date(assignment.dueDate).toLocaleDateString()}`
                                            : 'No due date'}
                                        {assignment.maxScore ? ` | ${assignment.maxScore} pts` : ''}
                                    </p>
                                </div>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => navigate(`/upload/${assignment.id}`)}
                                >
                                    <Upload className="h-4 w-4" />
                                    Submit PDF
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <div className="flex justify-between items-end border-b border-border pb-3 mb-4">
                    <h3 className="text-heading-sm text-text-primary font-semibold">Recent Feedback</h3>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {recentSubmissions.slice(0, 4).map((sub) => (
                        <Card key={sub.id} className="overflow-hidden hover:border-border-strong transition-colors">
                            <div className="border-b border-border px-5 py-3 flex justify-between items-center bg-surface-raised/40">
                                <span className="text-label text-text-secondary truncate pr-4">{sub.assignment?.title}</span>
                                <Badge
                                    variant={
                                        sub.status === 'GRADED'
                                            ? 'success'
                                            : sub.status === 'FAILED'
                                                ? 'destructive'
                                                : sub.status === 'EVALUATING'
                                                    ? 'accent'
                                                    : 'warning'
                                    }
                                >
                                    {sub.status === 'GRADED' ? 'Graded' : sub.status === 'EVALUATING' ? 'Evaluating' : sub.status === 'FAILED' ? 'Failed' : 'Pending'}
                                </Badge>
                            </div>

                            {sub.status === 'GRADED' ? (
                                <CardContent className="p-6">
                                    <div className="flex items-end gap-2 mb-3">
                                        <span className="text-heading-lg font-semibold text-text-primary leading-none font-mono">{sub.score}</span>
                                        <span className="text-heading-sm text-text-muted mb-1 font-mono">/{sub.assignment?.maxScore || 100}</span>
                                    </div>
                                    <Badge variant="secondary">{scoreLabel(sub.score)}</Badge>
                                </CardContent>
                            ) : sub.status === 'FAILED' ? (
                                <CardContent className="p-6">
                                    <p className="text-error font-medium">Evaluation failed.</p>
                                    <p className="text-body-sm text-text-secondary mt-1">Ask your teacher to review or reopen the submission.</p>
                                </CardContent>
                            ) : (
                                <CardContent className="p-6 processing-stripes">
                                    <p className="text-accent font-medium">{sub.status === 'EVALUATING' ? 'AI evaluation in progress' : 'Processing submission'}</p>
                                    <p className="text-body-sm text-text-secondary mt-1">Feedback will appear here once complete.</p>
                                </CardContent>
                            )}

                            <div className="p-5 pt-0 flex justify-between items-center">
                                <span className="font-mono text-mono-sm text-text-muted">ID {sub.id.substring(0, 6)}</span>
                                {sub.status !== 'FAILED' && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setSelectedSubmission(sub)}
                                        disabled={sub.status !== 'GRADED'}
                                        aria-label="View feedback"
                                    >
                                        View Details
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}

                    {recentSubmissions.length === 0 && (
                        <div className="xl:col-span-2 border border-dashed border-border rounded-lg p-12 text-center">
                            <p className="text-heading-sm text-text-muted font-medium mb-2">No feedback yet</p>
                            <p className="text-body-sm text-text-muted">Submit an assignment to receive grades.</p>
                        </div>
                    )}
                </div>
            </section>

            <SubmissionFeedbackModal
                submission={selectedSubmission}
                onClose={() => setSelectedSubmission(null)}
            />
        </div>
    );
};
