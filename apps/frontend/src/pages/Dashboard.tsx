import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import RubricManager from '../components/RubricManager';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { useSocket } from '../context/SocketContext';
import {
    useCreateAssignmentMutation,
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
} from '../features/assignments/assignmentApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { useGetRubricsQuery } from '../features/rubrics/rubricApi';
import type { Submission } from '../types';
import { toast } from 'sonner';

/** Returns a time-appropriate greeting based on the current hour. */
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

const Dashboard: React.FC = () => {
    const user = useAppSelector(selectCurrentUser);
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRubricManagerOpen, setIsRubricManagerOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const isTeacher = user?.role === 'TEACHER';
    const { socket } = useSocket();

    const [gradingProgress, setGradingProgress] = useState<Record<string, { step: string; percent: number; status: 'processing' | 'completed' | 'failed' }>>({});

    const { data: assignmentsData, isLoading: isAssignmentsLoading, refetch: refetchAssignments } = useGetTeacherAssignmentsQuery(undefined, { skip: !isTeacher });
    const { data: submissionsData, refetch: refetchSubmissions } = useGetRecentSubmissionsQuery();
    const { data: rubricsData } = useGetRubricsQuery(undefined, { skip: !isTeacher });
    const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState('100');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('');
    const [requireUniqueId, setRequireUniqueId] = useState(false);

    const activeAssignments = useMemo(() => assignmentsData?.data || [], [assignmentsData?.data]);
    const recentSubmissions = submissionsData?.data || [];

    useEffect(() => {
        if (!socket || !isTeacher) return;
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
    }, [socket, isTeacher, refetchAssignments, refetchSubmissions]);

    useEffect(() => {
        if (!socket || !isTeacher || !activeAssignments.length) return;
        activeAssignments.forEach((a) => socket.emit('watch-assignment', a.id));
        return () => activeAssignments.forEach((a) => socket.emit('unwatch-assignment', a.id));
    }, [socket, isTeacher, activeAssignments]);

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAssignment({ title, description, dueDate, maxScore: parseInt(maxScore), rubricId: selectedRubricId || undefined, requireUniqueId }).unwrap();
            setIsCreateModalOpen(false);
            setTitle(''); setDescription(''); setDueDate(''); setSelectedRubricId(''); setRequireUniqueId(false);
            toast.success('Assignment created successfully!');
        } catch (error) {
            toast.error('Failed to create assignment');
        }
    };

    const handleShareLink = async (assignmentId: string) => {
        const link = `${window.location.origin}/upload/${assignmentId}`;
        try { await navigator.clipboard.writeText(link); toast.success('Link copied'); }
        catch { window.prompt('Copy this link manually:', link); }
    };

    // Derived Stats
    const pendingCount = recentSubmissions.filter((s) => s.status === 'PENDING').length;
    const gradedCount = recentSubmissions.filter((s) => s.status === 'GRADED').length;
    const gradedSubmissions = recentSubmissions.filter((s) => s.status === 'GRADED' && s.score !== null);
    const avgScore = gradedSubmissions.length > 0 ? Math.round(gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / gradedSubmissions.length) : 0;

    return (
        <div className="w-full">
            {isRubricManagerOpen && <RubricManager onClose={() => setIsRubricManagerOpen(false)} />}

            {/* Create Assignment Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md bg-surface border-[4px] border-on-surface text-on-surface brutal-shadow rounded-none">
                    <DialogHeader>
                        <DialogTitle className="font-headline-md text-headline-md uppercase font-black">New Assignment</DialogTitle>
                        <DialogDescription className="font-body-md text-on-surface-variant">Fill in the details to create a new graded assignment.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAssignment} className="space-y-4 mt-2">
                        <div>
                            <label className="block font-label-caps text-label-caps mb-1">Title</label>
                            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow brutal-button" placeholder="Assignment Title" />
                        </div>
                        <div>
                            <label className="block font-label-caps text-label-caps mb-1">Instructions</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow brutal-button resize-none" rows={3} placeholder="Instructions..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-label-caps text-label-caps mb-1">Due Date</label>
                                <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow brutal-button" />
                            </div>
                            <div>
                                <label className="block font-label-caps text-label-caps mb-1">Max Score</label>
                                <input type="number" required value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="w-full px-3 py-2 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow brutal-button" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block font-label-caps text-label-caps">Rubric</label>
                                <button type="button" onClick={() => setIsRubricManagerOpen(true)} className="text-xs text-primary font-bold hover:underline">Create Rubric</button>
                            </div>
                            <select value={selectedRubricId} onChange={(e) => setSelectedRubricId(e.target.value)} className="w-full px-3 py-2 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow brutal-button">
                                <option value="">No Rubric</option>
                                {rubricsData?.data.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={isCreating} className="w-full bg-primary text-on-primary py-3 font-label-caps text-label-caps border-[4px] border-on-surface brutal-shadow brutal-button uppercase tracking-wide mt-4">
                            {isCreating ? 'Creating...' : 'Create Assignment'}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Teacher Dashboard View */}
            {isTeacher ? (
                <>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <h2 className="font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-surface uppercase tracking-tighter font-black">Welcome Back, <br/>{user?.name || user?.email?.split('@')[0] || 'Educator'}.</h2>
                        </div>
                        <div className="flex gap-4 flex-col sm:flex-row">
                            <button onClick={() => setIsRubricManagerOpen(true)} className="bg-surface text-on-surface border-[4px] border-on-surface px-6 py-3 font-label-caps text-label-caps uppercase tracking-wide brutal-shadow brutal-button flex items-center gap-2 hover:bg-surface-variant">
                                <span className="material-symbols-outlined">format_list_bulleted</span> Manage Rubrics
                            </button>
                            <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-on-primary border-[4px] border-on-surface px-6 py-3 font-label-caps text-label-caps uppercase tracking-wide brutal-shadow brutal-button flex items-center gap-2 hover:bg-primary-container">
                                <span className="material-symbols-outlined">add</span> New Assessment
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div className="bg-surface border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <span className="font-label-mono text-label-mono uppercase text-on-surface-variant">Active Assmts</span>
                                <span className="material-symbols-outlined text-primary">assignment</span>
                            </div>
                            <div>
                                <span className="font-headline-lg text-headline-lg font-black block mb-1">{activeAssignments.length}</span>
                            </div>
                        </div>
                        <div className="bg-primary border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between text-on-primary">
                            <div className="flex justify-between items-start mb-6">
                                <span className="font-label-mono text-label-mono uppercase opacity-90">Pending Grades</span>
                                <span className="material-symbols-outlined">hourglass_top</span>
                            </div>
                            <div>
                                <span className="font-headline-lg text-headline-lg font-black block mb-1">{pendingCount}</span>
                            </div>
                        </div>
                        <div className="bg-secondary border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between text-on-secondary">
                            <div className="flex justify-between items-start mb-6">
                                <span className="font-label-mono text-label-mono uppercase opacity-90">Total Graded</span>
                                <span className="material-symbols-outlined">done_all</span>
                            </div>
                            <div>
                                <span className="font-headline-lg text-headline-lg font-black block mb-1">{gradedCount}</span>
                            </div>
                        </div>
                        <div className="bg-accent-blue border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between text-on-surface">
                            <div className="flex justify-between items-start mb-6">
                                <span className="font-label-mono text-label-mono uppercase opacity-90">Avg. Score</span>
                                <span className="material-symbols-outlined">analytics</span>
                            </div>
                            <div>
                                <span className="font-headline-lg text-headline-lg font-black block mb-1">{avgScore}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4">
                                <h3 className="font-headline-md text-headline-md font-black uppercase tracking-tight">Active Grading Pipelines</h3>
                            </div>
                            {isAssignmentsLoading ? <p>Loading...</p> : activeAssignments.map((assignment) => (
                                <div key={assignment.id} className="bg-surface border-[4px] border-on-surface p-0 flex flex-col brutal-shadow">
                                    <div className="bg-on-surface text-surface px-4 py-2 flex justify-between items-center">
                                        <span className="font-label-mono text-[12px] uppercase tracking-widest">{assignment.otp}</span>
                                        <span className="font-label-mono text-[12px] bg-secondary text-on-secondary px-2 border-[2px] border-transparent font-bold">ACTIVE</span>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="font-headline-md text-[20px] font-bold mb-2 uppercase">{assignment.title}</h4>
                                        <div className="flex justify-between font-label-mono text-[12px] text-on-surface-variant mb-4">
                                            <span>Submissions: {assignment._count?.submissions || 0}</span>
                                            <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex gap-4 mt-6">
                                            <button onClick={() => navigate(`/assignment/${assignment.id}/submissions`)} className="flex-1 bg-surface border-[4px] border-on-surface py-2 font-label-caps text-label-caps uppercase brutal-shadow brutal-button hover:bg-primary hover:text-on-primary">
                                                Review Submissions
                                            </button>
                                            <button onClick={() => handleShareLink(assignment.id)} className="p-2 border-[4px] border-on-surface bg-surface brutal-shadow brutal-button flex items-center justify-center hover:bg-surface-variant">
                                                <span className="material-symbols-outlined">share</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="lg:col-span-1 flex flex-col">
                            <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4 mb-6">
                                <h3 className="font-headline-md text-headline-md font-black uppercase tracking-tight flex items-center gap-2">
                                    <span className="w-3 h-3 bg-secondary border-[2px] border-on-surface animate-pulse"></span>
                                    Live Output
                                </h3>
                            </div>
                            <div className="flex-1 bg-on-surface border-[4px] border-on-surface p-4 font-label-mono text-label-mono overflow-y-auto h-[600px] flex flex-col gap-2 relative brutal-shadow">
                                <div className="text-surface-variant opacity-50 mb-4 border-b-[2px] border-surface-variant pb-2 text-xs">
                                    Listening for grading activity...
                                </div>
                                {recentSubmissions.slice(0, 10).map((sub) => {
                                    const progress = gradingProgress[sub.id];
                                    const statusText = progress ? progress.step : sub.status;
                                    const isError = progress?.status === 'failed';
                                    const isDone = sub.status === 'GRADED' || progress?.status === 'completed';
                                    return (
                                        <div key={sub.id} className="flex gap-4 text-xs mb-2">
                                            <span className="text-surface-variant w-12 flex-shrink-0">{new Date(sub.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            <span className={isError ? "text-error" : isDone ? "text-secondary-fixed" : "text-primary-fixed"}>
                                                [{sub.assignment?.title.substring(0, 8)}] {sub.student?.email?.split('@')[0] || 'Unknown'} - {statusText.toUpperCase()}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div className="flex gap-4 mt-auto pt-4">
                                    <span className="text-surface-variant animate-pulse">_</span>
                                    <span className="text-surface-variant">Awaiting next task...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* Student Dashboard View */
                <>
                    <section className="mb-16">
                        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                            <div className="flex-1 bg-surface border-[4px] border-on-surface brutal-shadow p-8 lg:p-12 relative overflow-hidden">
                                <div className="absolute -right-16 -top-16 w-64 h-64 border-[4px] border-on-surface rounded-full opacity-10 pointer-events-none"></div>
                                <h2 className="font-headline-xl text-headline-xl md:text-[80px] leading-none font-black text-on-surface tracking-tighter uppercase mb-4 relative z-10">
                                    {getGreeting()},<br /><span className="text-primary">{user?.name || user?.email?.split('@')[0] || 'Student'}!</span>
                                </h2>
                                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md relative z-10">
                                    You have {pendingCount} pending assignments.
                                </p>
                            </div>
                            <div className="lg:w-1/3 bg-accent-yellow border-[4px] border-on-surface brutal-shadow flex flex-col">
                                <div className="bg-on-surface text-surface px-6 py-3 font-label-caps text-label-caps border-b-[4px] border-on-surface flex justify-between items-center font-bold">
                                    <span>Status</span>
                                    <span className="material-symbols-outlined text-accent-yellow">priority_high</span>
                                </div>
                                <div className="flex-1 p-8 flex flex-col justify-center items-center text-center">
                                    <span className="material-symbols-outlined text-[64px] mb-4 text-on-surface" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                                    <div className="font-headline-md text-headline-md text-on-surface font-black uppercase">All Caught Up</div>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                        <section>
                            <div className="flex justify-between items-end mb-6 border-b-[4px] border-on-surface pb-2">
                                <h3 className="font-headline-md text-headline-md font-black uppercase tracking-tight">Recent Feedback</h3>
                            </div>
                            <div className="space-y-6">
                                {recentSubmissions.filter(s => s.status === 'GRADED').slice(0, 3).map(sub => (
                                    <div key={sub.id} className="bg-surface border-[4px] border-on-surface brutal-shadow flex flex-col h-full hover:-translate-y-1 hover:brutal-shadow-lg transition-all duration-200">
                                        <div className="bg-secondary text-on-secondary px-4 py-2 font-label-caps text-label-caps border-b-[4px] border-on-surface flex justify-between items-center font-bold">
                                            <span>{sub.assignment?.title}</span>
                                            <span className="material-symbols-outlined text-sm">science</span>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col justify-center items-center bg-secondary-fixed border-b-[4px] border-on-surface relative">
                                            <div className="font-headline-xl text-headline-xl font-black text-on-surface leading-none mb-2">
                                                {sub.score}<span className="text-headline-md font-headline-md text-on-surface-variant">/{sub.assignment?.maxScore || 100}</span>
                                            </div>
                                            <div className="font-label-mono text-label-mono font-bold bg-surface border-[2px] border-on-surface px-3 py-1 uppercase">{sub.score! >= 90 ? 'Excellent' : 'Graded'}</div>
                                        </div>
                                        <div className="p-4 bg-surface flex justify-between items-center">
                                            <span className="font-body-md text-body-md font-bold truncate pr-4">Submission ID: {sub.id.substring(0,6)}</span>
                                            <button onClick={() => setSelectedSubmission(sub)} className="w-10 h-10 border-[2px] border-on-surface flex items-center justify-center bg-primary text-on-primary brutal-shadow brutal-button flex-shrink-0">
                                                <span className="material-symbols-outlined">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {recentSubmissions.filter(s => s.status === 'GRADED').length === 0 && (
                                    <div className="p-6 border-[4px] border-on-surface bg-surface-variant font-label-mono uppercase text-center">No recent feedback</div>
                                )}
                            </div>
                        </section>
                    </div>
                </>
            )}

            {/* Submission Detail Modal */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-surface border-[4px] border-on-surface text-on-surface brutal-shadow rounded-none">
                    <DialogHeader>
                        <DialogTitle className="font-headline-md text-headline-md font-black uppercase border-b-[4px] border-on-surface pb-2">Feedback Summary</DialogTitle>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-6 mt-4 font-body-md">
                            <div className="flex gap-4">
                                <div className="bg-secondary-fixed border-[4px] border-on-surface p-4 inline-block brutal-shadow">
                                    <h3 className="font-label-caps text-label-caps uppercase font-bold mb-1">Score</h3>
                                    <div className="font-headline-lg font-black text-on-surface">{selectedSubmission.score}<span className="text-headline-md">/{selectedSubmission.assignment?.maxScore || 100}</span></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-label-caps text-label-caps uppercase font-bold mb-2">AI Analysis</h3>
                                <div className="bg-surface-variant border-[4px] border-on-surface p-4 prose max-w-none text-on-surface brutal-shadow">
                                    <ReactMarkdown>{selectedSubmission.feedback || 'No feedback.'}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Dashboard;