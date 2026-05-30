import { Award, BarChart3, FileText, FolderClock, Plus, PlusCircle, Share2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../app/store';
import MeshBackground from '../components/MeshBackground';
import RubricManager from '../components/RubricManager';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useSocket } from '../context/SocketContext';
import {
    useAllowResubmissionMutation,
    useCreateAssignmentMutation,
    useGetRecentSubmissionsQuery,
    useGetTeacherAssignmentsQuery,
    useReEvaluateSubmissionMutation,
} from '../features/assignments/assignmentApi';
import { selectCurrentUser } from '../features/auth/authSlice';
import { useGetRubricsQuery } from '../features/rubrics/rubricApi';
import type { Submission } from '../types';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
    const user = useAppSelector(selectCurrentUser);
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRubricManagerOpen, setIsRubricManagerOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const isTeacher = user?.role === 'TEACHER';
    const { socket } = useSocket();

    // Track grading progress for each submission
    const [gradingProgress, setGradingProgress] = useState<
        Record<
            string,
            {
                step: string;
                percent: number;
                status: 'processing' | 'completed' | 'failed';
            }
        >
    >({});

    // API Hooks
    const {
        data: assignmentsData,
        isLoading: isAssignmentsLoading,
        refetch: refetchAssignments,
    } = useGetTeacherAssignmentsQuery(undefined, {
        skip: !isTeacher,
    });
    const {
        data: submissionsData,
        isLoading: isSubmissionsLoading,
        refetch: refetchSubmissions,
    } = useGetRecentSubmissionsQuery();
    const { data: rubricsData } = useGetRubricsQuery(undefined, { skip: !isTeacher });
    const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();
    const [reEvaluateSubmission] = useReEvaluateSubmissionMutation();
    const [allowResubmission] = useAllowResubmissionMutation();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState('100');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('');
    const [requireUniqueId, setRequireUniqueId] = useState(false);

    const activeAssignments = useMemo(
        () => assignmentsData?.data || [],
        [assignmentsData?.data],
    );

    useEffect(() => {
        if (!socket || !isTeacher) return;

        const handleGradingProgress = (event: {
            submissionId: string;
            step?: string;
            percent?: number;
            error?: string;
            score?: number;
        }) => {
            let displayStatus: 'pending' | 'downloading' | 'grading' | 'graded' | 'failed' = 'pending';
            if (event.error) {
                displayStatus = 'failed';
            } else if (event.step === 'grading_completed') {
                displayStatus = 'graded';
                refetchSubmissions();
                refetchAssignments();
            } else if (
                event.step === 'downloading_pdf' ||
                event.step === 'pdf_downloaded' ||
                event.step === 'submission_started'
            ) {
                displayStatus = 'downloading';
            } else if (
                event.step === 'parsing_started' ||
                event.step === 'page_parsed' ||
                event.step === 'parsing_completed' ||
                event.step === 'gemini_started' ||
                event.step === 'gemini_processing' ||
                event.step === 'gemini_completed'
            ) {
                displayStatus = 'grading';
            }

            setGradingProgress((prev) => ({
                ...prev,
                [event.submissionId]: {
                    step: displayStatus,
                    percent: event.percent || 0,
                    status: event.error
                        ? 'failed'
                        : event.step === 'grading_completed'
                            ? 'completed'
                            : 'processing',
                },
            }));
        };

        socket.on('assignment-grading-progress', handleGradingProgress);

        const handleNewSubmission = (_event: { assignmentId: string }) => {
            refetchAssignments();
            refetchSubmissions();
        };

        socket.on('new-submission', handleNewSubmission);

        return () => {
            socket.off('assignment-grading-progress', handleGradingProgress);
            socket.off('new-submission', handleNewSubmission);
        };
    }, [socket, isTeacher, refetchAssignments, refetchSubmissions]);

    // Watch all active assignments for grading updates (teachers only)
    useEffect(() => {
        if (!socket || !isTeacher || !activeAssignments.length) return;

        activeAssignments.forEach((assignment) => {
            socket.emit('watch-assignment', assignment.id);
        });

        return () => {
            activeAssignments.forEach((assignment) => {
                socket.emit('unwatch-assignment', assignment.id);
            });
        };
    }, [socket, isTeacher, activeAssignments]);

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAssignment({
                title,
                description,
                dueDate,
                maxScore: parseInt(maxScore),
                rubricId: selectedRubricId || undefined,
                requireUniqueId,
            }).unwrap();
            setIsCreateModalOpen(false);
            setTitle('');
            setDescription('');
            setDueDate('');
            setSelectedRubricId('');
            setRequireUniqueId(false);
            toast.success('Assignment created successfully!');
        } catch (error) {
            console.error('Failed to create assignment', error);
            toast.error('Failed to create assignment');
        }
    };

    const handleShareLink = async (assignmentId: string) => {
        const link = `${window.location.origin}/upload/${assignmentId}`;
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Submission link copied to clipboard');
        } catch {
            window.prompt('Copy this link manually:', link);
        }
    };

    const handleReEvaluate = async (submissionId: string) => {
        try {
            await reEvaluateSubmission({ submissionId }).unwrap();
            toast.success('Submission queued for re-evaluation');
        } catch {
            toast.error('Failed to trigger re-evaluation');
        }
    };

    const handleAllowResubmission = async (submissionId: string) => {
        try {
            await allowResubmission({ submissionId }).unwrap();
            toast.success('Submission deleted. Student can now resubmit.');
            setConfirmDeleteId(null);
            setSelectedSubmission(null);
        } catch {
            toast.error('Failed to allow resubmission');
        }
    };

    const recentSubmissions = submissionsData?.data || [];

    // Calculate stats
    const pendingCount = recentSubmissions.filter((s) => s.status === 'PENDING').length;
    const gradedCount = recentSubmissions.filter((s) => s.status === 'GRADED').length;
    // Calculate average score for graded submissions
    const gradedSubmissions = recentSubmissions.filter(
        (s) => s.status === 'GRADED' && s.score !== null
    );
    const avgScore =
        gradedSubmissions.length > 0
            ? Math.round(
                gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) /
                gradedSubmissions.length
            )
            : 0;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-24 pb-8 relative overflow-hidden">
            {/* Mesh Background */}
            <MeshBackground />
            {/* Rubric Manager Modal */}
            {isRubricManagerOpen && <RubricManager onClose={() => setIsRubricManagerOpen(false)} />}

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Create Assignment</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Fill in the details to create a new assignment.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAssignment} className="space-y-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-zinc-300">Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                                placeholder="Assignment Title"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-zinc-300">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
                                rows={3}
                                placeholder="Instructions..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-zinc-300">Due Date</label>
                                <input
                                    type="date"
                                    required
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-zinc-300">Max Score</label>
                                <input
                                    type="number"
                                    required
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-medium text-zinc-300">Rubric (Optional)</label>
                                <button
                                    type="button"
                                    onClick={() => setIsRubricManagerOpen(true)}
                                    className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 bg-violet-500/10 px-2 py-1 rounded transition-colors"
                                >
                                    <PlusCircle className="h-3 w-3" /> Create Rubric
                                </button>
                            </div>
                            <select
                                value={selectedRubricId}
                                onChange={(e) => {
                                    const rubricId = e.target.value;
                                    setSelectedRubricId(rubricId);
                                    if (rubricId && rubricsData?.data) {
                                        const selectedRubric = rubricsData.data.find(r => r.id === rubricId);
                                        if (selectedRubric?.criteria) {
                                            const totalPoints = selectedRubric.criteria.reduce(
                                                (sum, criterion) => sum + (criterion.points || 0),
                                                0
                                            );
                                            if (totalPoints > 0) setMaxScore(totalPoints.toString());
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                            >
                                <option value="" className="bg-zinc-900">No Rubric</option>
                                {rubricsData?.data.map((rubric) => (
                                    <option key={rubric.id} value={rubric.id} className="bg-zinc-900">
                                        {rubric.name} ({rubric.criteria.reduce((sum, c) => sum + (c.points || 0), 0)} pts)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="requireUniqueId"
                                checked={requireUniqueId}
                                onChange={(e) => setRequireUniqueId(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500/50"
                            />
                            <label htmlFor="requireUniqueId" className="text-sm text-zinc-400">
                                Require University ID on submission
                            </label>
                        </div>
                        <Button
                            type="submit"
                            disabled={isCreating}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : 'Create Assignment'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Submission</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            This will permanently delete the submission and allow the student to resubmit. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="outline"
                            className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                            onClick={() => setConfirmDeleteId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => confirmDeleteId && handleAllowResubmission(confirmDeleteId)}
                        >
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {isTeacher ? 'Instructor Dashboard' : 'Student Dashboard'}
                        </h1>
                        <p className="text-zinc-500 mt-1 text-sm">
                            Overview for {user?.email}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {isTeacher && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create Assignment</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-zinc-900/60 backdrop-blur-sm border border-violet-500/20 p-6 rounded-2xl shadow-[0_0_30px_-10px_rgba(139,92,246,0.25)]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-violet-500/20 rounded-lg">
                                <FolderClock className="h-6 w-6 text-violet-400" />
                            </div>
                            <h3 className="text-zinc-300 font-medium">
                                {isTeacher ? 'To Grade' : 'Pending'}
                            </h3>
                        </div>
                        <p className="text-4xl font-bold text-white mt-2">{pendingCount}</p>
                    </div>
                    <div className="bg-zinc-900/60 backdrop-blur-sm border border-emerald-500/20 p-6 rounded-2xl shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <Award className="h-6 w-6 text-emerald-400" />
-                            </div>
                            <h3 className="text-zinc-300 font-medium">
                                {isTeacher ? 'Graded This Week' : 'Completed'}
                            </h3>
                        </div>
                        <p className="text-4xl font-bold text-white mt-2">{gradedCount}</p>
                    </div>
                    <div className="bg-zinc-900/60 backdrop-blur-sm border border-purple-500/20 p-6 rounded-2xl shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-purple-400" />
                            </div>
                            <h3 className="text-zinc-300 font-medium">Avg Score</h3>
                        </div>
                        <p className="text-4xl font-bold text-white mt-2">{avgScore}%</p>
                    </div>
                </div>

                {isTeacher && (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm mb-10">
                        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white">Active Assignments</h2>
                            <button
                                onClick={() => setIsRubricManagerOpen(true)}
                                className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                                aria-label="Manage rubrics"
                            >
                                <FileText className="h-4 w-4" /> Manage Rubrics
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-800">
                                <thead className="bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Due Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">OTP</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Submissions</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800 bg-transparent">
                                    {isAssignmentsLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeAssignments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                                                No assignments yet. Create your first one.
                                            </td>
                                        </tr>
                                    ) : (
                                        activeAssignments.map((item) => (
                                            <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-200">{item.title}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-zinc-500">{item.otp}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{item._count?.submissions || 0}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => navigate(`/assignment/${item.id}/submissions`)}
                                                            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                                                            aria-label={`View submissions for ${item.title}`}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            Submissions
                                                        </button>
                                                        <button
                                                            onClick={() => handleShareLink(item.id)}
                                                            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors"
                                                            aria-label={`Copy submission link for ${item.title}`}
                                                        >
                                                            <Share2 className="h-4 w-4" />
                                                            Share
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="px-6 py-5 border-b border-zinc-800">
                        <h2 className="text-lg font-semibold text-white">
                            {isTeacher ? 'Recent Submissions' : 'My Submissions'}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-800">
                            <thead className="bg-zinc-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Assignment</th>
                                    {isTeacher && (
                                        <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Student</th>
                                    )}
                                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Submitted</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800 bg-transparent">
                                {isSubmissionsLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={isTeacher ? 6 : 5} className="px-6 py-4">
                                                <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
                                            </td>
                                        </tr>
                                    ))
                                ) : recentSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={isTeacher ? 6 : 5} className="px-6 py-8 text-center text-sm text-zinc-500">
                                            No submissions yet.
                                        </td>
                                    </tr>
                                ) : (
                                    recentSubmissions.map((item) => (
                                        <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-200">
                                                {item.assignment?.title || 'Unknown Assignment'}
                                            </td>
                                            {isTeacher && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                                                    {item.student?.name || item.student?.email || 'Unknown Student'}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                                {new Date(item.submittedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {gradingProgress[item.id]?.status === 'processing' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full" />
                                                        <span className="text-sm text-violet-400 capitalize">
                                                            {gradingProgress[item.id].step || 'Processing'}
                                                        </span>
                                                    </div>
                                                ) : gradingProgress[item.id]?.status === 'failed' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                        Failed
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                        item.status === 'GRADED'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                        {item.status === 'GRADED' ? 'Graded' : 'Pending'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-300">
                                                {item.score !== null ? `${item.score}/${item.assignment?.maxScore || 100}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-4 items-center">
                                                    <button
                                                        onClick={() => setSelectedSubmission(item)}
                                                        className="text-violet-400 hover:text-violet-300 transition-colors"
                                                        aria-label={`View summary for ${item.assignment?.title}`}
                                                    >
                                                        View
                                                    </button>
                                                    {isTeacher && (
                                                        <>
                                                            <button
                                                                onClick={() => handleReEvaluate(item.id)}
                                                                className="text-amber-400 hover:text-amber-300 transition-colors"
                                                                aria-label={`Re-evaluate submission for ${item.assignment?.title}`}
                                                            >
                                                                Re-evaluate
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(item.id)}
                                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                                aria-label={`Delete submission for ${item.assignment?.title}`}
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Submission Summary</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Detailed feedback and score for{' '}
                            {selectedSubmission?.assignment?.title || 'Assignment'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubmission && (
                        <div className="space-y-6 mt-4">
                            <div>
                                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Score</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-violet-400">
                                        {selectedSubmission.score ?? '—'}
                                    </span>
                                    <span className="text-zinc-500 text-sm">/ {selectedSubmission.assignment?.maxScore || 100}</span>
                                </div>
                            </div>

                            {isTeacher && (
                                <div>
                                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Actions</h3>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleReEvaluate(selectedSubmission.id)}
                                            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors border border-amber-500/20"
                                        >
                                            Re-evaluate (AI)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setConfirmDeleteId(selectedSubmission.id);
                                                setSelectedSubmission(null);
                                            }}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                                        >
                                            Delete & Allow Resubmission
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Feedback</h3>
                                <div className="bg-zinc-950 p-4 rounded-lg text-sm prose prose-invert max-w-none border border-zinc-800">
                                    <ReactMarkdown>
                                        {selectedSubmission.feedback || 'No feedback available.'}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            <a
                                href={selectedSubmission.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 text-center border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors font-medium text-zinc-300 text-sm"
                            >
                                View Original PDF
                            </a>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Dashboard;