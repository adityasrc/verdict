import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import RubricManager from './RubricManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useSocket } from '../context/SocketContext';
import {
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { toast } from 'sonner';
import { CreateAssignmentModal } from './modals/CreateAssignmentModal';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, className }) => (
    <Card className={`flex flex-col justify-between ${className || ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-label-caps uppercase font-bold text-sm tracking-widest">{label}</CardTitle>
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </CardHeader>
        <CardContent>
            <span className="font-headline-lg text-4xl md:text-5xl font-black block uppercase tracking-tighter">{value}</span>
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

    const handleShareLink = async (assignmentId: string) => {
        const link = `${window.location.origin}/upload/${assignmentId}`;
        try { await navigator.clipboard.writeText(link); toast.success('Link copied'); }
        catch { window.prompt('Copy this link manually:', link); }
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

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h2 className="font-headline-xl text-4xl md:text-5xl text-on-surface uppercase tracking-tighter font-black leading-none">
                        Welcome Back, <br /><span className="text-primary">{user?.name || user?.email?.split('@')[0] || 'Educator'}</span>.
                    </h2>
                </div>
                <div className="flex gap-4 flex-col sm:flex-row">
                    <Button variant="brutal-ghost" className="h-14 px-6" onClick={() => setIsRubricManagerOpen(true)}>
                        <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
                        Manage Rubrics
                    </Button>
                    <Button variant="brutal" className="h-14 px-6" onClick={() => setIsCreateModalOpen(true)}>
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        New Assessment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard label="Assessments" value={activeAssignments.length} icon="assignment" />
                <StatCard
                    label="Pending Grades"
                    value={pendingCount}
                    icon="hourglass_top"
                    className="bg-primary text-on-primary [&_.font-label-caps]:text-on-primary"
                />
                <StatCard
                    label="Total Graded"
                    value={gradedCount}
                    icon="done_all"
                    className="bg-secondary text-on-secondary [&_.font-label-caps]:text-on-secondary"
                />
                <StatCard
                    label="Avg. Score"
                    value={`${avgScore}%`}
                    icon="analytics"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4">
                        <h3 className="font-headline-md text-2xl font-black uppercase tracking-tight text-on-surface">
                            Active Grading Pipelines
                        </h3>
                    </div>

                    {isAssignmentsLoading ? (
                        <p className="font-label-mono uppercase font-bold animate-pulse text-on-surface">Loading...</p>
                    ) : activeAssignments.length === 0 ? (
                        <div className="border-[4px] border-on-surface border-dashed p-12 text-center bg-surface">
                            <p className="font-headline-md text-3xl font-black uppercase tracking-tighter text-on-surface-variant">
                                NO ACTIVE<br />ASSIGNMENTS
                            </p>
                            <p className="font-label-mono uppercase text-on-surface-variant mt-4 font-bold text-sm">
                                Create one to get started
                            </p>
                            <Button variant="brutal" onClick={() => setIsCreateModalOpen(true)} className="mt-8">
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                New Assessment
                            </Button>
                        </div>
                    ) : (
                        <>
                            {visibleAssignments.map((assignment) => (
                                <div key={assignment.id} className="bg-surface border-[4px] border-on-surface brutal-shadow flex flex-col hover:-translate-y-1 transition-transform duration-75 linear">
                                    <div className="bg-on-surface text-surface px-4 py-2 flex justify-between items-center">
                                        <span className="font-label-caps text-[11px] bg-secondary text-on-secondary px-2 py-0.5 border-[2px] border-transparent font-black tracking-widest">ACTIVE</span>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="font-headline-md text-[24px] font-black mb-2 uppercase tracking-tighter">{assignment.title}</h4>
                                        <div className="flex justify-between font-label-mono text-[12px] text-on-surface-variant mb-6 font-bold uppercase">
                                            <span>Submissions: {assignment._count?.submissions || 0}</span>
                                            <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Open'}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="brutal-ghost"
                                                className="flex-1"
                                                onClick={() => navigate(`/assignment/${assignment.id}/submissions`)}
                                            >
                                                Review Submissions
                                            </Button>
                                            <Button
                                                variant="brutal-ghost"
                                                className="px-4"
                                                onClick={() => handleShareLink(assignment.id)}
                                                aria-label="Copy share link"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">share</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activeAssignments.length > ASSIGNMENTS_PER_PAGE && (
                                <Button
                                    variant="brutal-ghost"
                                    onClick={() => setShowAllAssignments((v) => !v)}
                                    className="w-full h-14"
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
                    <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4 mb-6">
                        <h3 className="font-headline-md text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-on-surface">
                            <span className="w-4 h-4 bg-secondary border-[4px] border-on-surface animate-pulse" />
                            Live Output
                        </h3>
                    </div>
                    <div className="terminal-window flex-1 bg-on-surface border-[4px] border-on-surface p-6 font-label-mono text-secondary overflow-y-auto h-[600px] flex flex-col gap-3 brutal-shadow text-xs">
                        <div className="text-surface/60 mb-4 border-b-[4px] border-surface/20 pb-4 font-bold uppercase tracking-widest">
                            Listening for grading activity...
                        </div>
                        {recentSubmissions.slice(0, 10).map((sub) => {
                            const progress = gradingProgress[sub.id];
                            const statusText = progress ? progress.step : sub.status;
                            const isError = progress?.status === 'failed' || sub.status === 'FAILED';
                            const isDone = sub.status === 'GRADED' || progress?.status === 'completed';
                            return (
                                <div key={sub.id} className="flex gap-4 mb-2">
                                    <span className="text-surface/40 w-12 flex-shrink-0">
                                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={isError ? 'text-error font-bold' : isDone ? 'text-secondary' : 'text-accent-yellow'}>
                                        [{sub.assignment?.title.substring(0, 8)}] {sub.student?.email?.split('@')[0] || 'Unknown'} — {statusText.toUpperCase()}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="flex gap-3 mt-auto pt-4 items-center">
                            <span className="text-secondary animate-pulse text-lg">_</span>
                            <span className="text-surface/60 font-bold uppercase tracking-widest">Awaiting next task...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};