import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import RubricManager from './RubricManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useSocket } from '../context/SocketContext';
import {
    useCreateAssignmentMutation,
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { useGetRubricsQuery } from '../features/rubrics/rubricApi';
import { parseApiError } from '../lib/errors';
import { toast } from 'sonner';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: string;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, className }) => (
    <Card className={className}>
        <CardHeader>
            <CardTitle>{label}</CardTitle>
            <span className="material-symbols-outlined">{icon}</span>
        </CardHeader>
        <CardContent className="pt-6">
            <span className="font-headline-lg text-headline-lg font-black block">{value}</span>
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
    const { data: rubricsData } = useGetRubricsQuery();
    const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState('100');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('');
    const [requireUniqueId, setRequireUniqueId] = useState(false);

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

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAssignment({ title, description, dueDate, maxScore: parseInt(maxScore), rubricId: selectedRubricId || undefined, requireUniqueId }).unwrap();
            setIsCreateModalOpen(false);
            setTitle(''); setDescription(''); setDueDate(''); setSelectedRubricId(''); setRequireUniqueId(false);
            toast.success('Assignment created successfully!');
        } catch (error) {
            toast.error(parseApiError(error, 'Failed to create assignment'));
        }
    };

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
            {isRubricManagerOpen && <RubricManager onClose={() => setIsRubricManagerOpen(false)} />}

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Assignment</DialogTitle>
                        <DialogDescription>Fill in the details to create a new graded assignment.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAssignment} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Assignment Title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Instructions</Label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow transition-colors duration-75 resize-none"
                                rows={3}
                                placeholder="Instructions..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    required
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Score</Label>
                                <Input
                                    type="number"
                                    required
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Rubric</Label>
                                <button
                                    type="button"
                                    onClick={() => setIsRubricManagerOpen(true)}
                                    className="text-xs text-primary font-bold hover:underline font-label-caps uppercase"
                                >
                                    + Create Rubric
                                </button>
                            </div>
                            <select
                                value={selectedRubricId}
                                onChange={(e) => setSelectedRubricId(e.target.value)}
                                className="flex h-12 w-full px-4 border-[4px] border-on-surface bg-surface text-on-surface font-body-md focus:outline-none focus:border-primary brutal-shadow transition-colors duration-75 appearance-none"
                            >
                                <option value="">No Rubric</option>
                                {rubricsData?.data.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="requireUniqueId"
                                checked={requireUniqueId}
                                onChange={(e) => setRequireUniqueId(e.target.checked)}
                                className="w-5 h-5 border-[2px] border-on-surface accent-primary"
                            />
                            <Label htmlFor="requireUniqueId" className="cursor-pointer">Require Student ID</Label>
                        </div>
                        <Button type="submit" variant="brutal" size="lg" disabled={isCreating} className="w-full mt-4">
                            {isCreating ? 'Creating...' : 'Create Assignment'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h2 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-surface uppercase tracking-tighter font-black">
                        Welcome Back, <br />{user?.name || user?.email?.split('@')[0] || 'Educator'}.
                    </h2>
                </div>
                <div className="flex gap-4 flex-col sm:flex-row">
                    <Button variant="brutal-ghost" onClick={() => setIsRubricManagerOpen(true)}>
                        <span className="material-symbols-outlined">format_list_bulleted</span>
                        Manage Rubrics
                    </Button>
                    <Button variant="brutal" onClick={() => setIsCreateModalOpen(true)}>
                        <span className="material-symbols-outlined">add</span>
                        New Assessment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard label="Active Assmts" value={activeAssignments.length} icon="assignment" />
                <StatCard
                    label="Pending Grades"
                    value={pendingCount}
                    icon="hourglass_top"
                    className="bg-primary text-on-primary [&_.font-label-mono]:opacity-90 [&_.material-symbols-outlined]:text-on-primary"
                />
                <StatCard
                    label="Total Graded"
                    value={gradedCount}
                    icon="done_all"
                    className="bg-secondary text-on-secondary [&_.font-label-mono]:opacity-90 [&_.material-symbols-outlined]:text-on-secondary"
                />
                <StatCard
                    label="Avg. Score"
                    value={`${avgScore}%`}
                    icon="analytics"
                    className="bg-accent-blue text-on-surface"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4">
                        <h3 className="font-headline-md text-headline-md font-black uppercase tracking-tight">
                            Active Grading Pipelines
                        </h3>
                    </div>

                    {isAssignmentsLoading ? (
                        <p className="font-label-mono uppercase font-bold animate-pulse">Loading...</p>
                    ) : activeAssignments.length === 0 ? (
                        <div className="border-[4px] border-on-surface border-dashed p-12 text-center">
                            <p className="font-headline-md text-3xl font-black uppercase tracking-tighter text-on-surface-variant">
                                NO ACTIVE<br />ASSIGNMENTS
                            </p>
                            <p className="font-label-mono uppercase text-on-surface-variant mt-4 font-bold text-sm">
                                Create one to get started
                            </p>
                            <Button variant="brutal" onClick={() => setIsCreateModalOpen(true)} className="mt-6">
                                <span className="material-symbols-outlined">add</span>
                                New Assessment
                            </Button>
                        </div>
                    ) : (
                        <>
                            {visibleAssignments.map((assignment) => (
                                <div key={assignment.id} className="bg-surface border-[4px] border-on-surface brutal-shadow flex flex-col">
                                    <div className="bg-on-surface text-surface px-4 py-2 flex justify-between items-center">
                                        <span className="font-label-mono text-[12px] uppercase tracking-widest">PIN: {assignment.otp}</span>
                                        <span className="font-label-mono text-[12px] bg-secondary text-on-secondary px-2 border-[2px] border-transparent font-bold">ACTIVE</span>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="font-headline-md text-[20px] font-bold mb-2 uppercase">{assignment.title}</h4>
                                        <div className="flex justify-between font-label-mono text-[12px] text-on-surface-variant mb-6">
                                            <span>Submissions: {assignment._count?.submissions || 0}</span>
                                            <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Open'}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="brutal-ghost"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => navigate(`/assignment/${assignment.id}/submissions`)}
                                            >
                                                Review Submissions
                                            </Button>
                                            <Button
                                                variant="brutal-ghost"
                                                size="icon"
                                                onClick={() => handleShareLink(assignment.id)}
                                                aria-label="Copy share link"
                                            >
                                                <span className="material-symbols-outlined">share</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activeAssignments.length > ASSIGNMENTS_PER_PAGE && (
                                <Button
                                    variant="brutal-outline"
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
                    <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4 mb-6">
                        <h3 className="font-headline-md text-headline-md font-black uppercase tracking-tight flex items-center gap-2">
                            <span className="w-3 h-3 bg-secondary border-[2px] border-on-surface animate-pulse" />
                            Live Output
                        </h3>
                    </div>
                    <div className="terminal-window flex-1 bg-[#0d1117] border-[4px] border-on-surface p-4 font-label-mono text-[#c9d1d9] overflow-y-auto h-[600px] flex flex-col gap-2 brutal-shadow text-xs">
                        <div className="text-[#6e7681] mb-4 border-b-[1px] border-[#30363d] pb-2">
                            Listening for grading activity...
                        </div>
                        {recentSubmissions.slice(0, 10).map((sub) => {
                            const progress = gradingProgress[sub.id];
                            const statusText = progress ? progress.step : sub.status;
                            const isError = progress?.status === 'failed';
                            const isDone = sub.status === 'GRADED' || progress?.status === 'completed';
                            return (
                                <div key={sub.id} className="flex gap-4 mb-2">
                                    <span className="text-[#6e7681] w-12 flex-shrink-0">
                                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={isError ? 'text-[#ff7b72] font-bold' : isDone ? 'text-[#7ee787]' : 'text-[#79c0ff]'}>
                                        [{sub.assignment?.title.substring(0, 8)}] {sub.student?.email?.split('@')[0] || 'Unknown'} — {statusText.toUpperCase()}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="flex gap-2 mt-auto pt-4">
                            <span className="text-[#7ee787] animate-pulse">_</span>
                            <span className="text-[#6e7681]">Awaiting next task...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
