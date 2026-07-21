import React, { useState } from 'react';
import { useAppSelector } from '../app/store';
import { Button } from './ui/button';
import { useGetRecentSubmissionsQuery } from '../features/assignments/assignmentApi';
import { SubmissionFeedbackModal } from './modals/SubmissionFeedbackModal';
import { selectCurrentUser } from '../features/auth/authSlice';
import type { Submission } from '../types';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

export const StudentDashboard: React.FC = () => {
    const user = useAppSelector(selectCurrentUser);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const { data: submissionsData } = useGetRecentSubmissionsQuery();

    const recentSubmissions = submissionsData?.data || [];
    const pendingCount = recentSubmissions.filter((s) => s.status === 'PENDING').length;
    
    const totalSubmissions = recentSubmissions.length;
    const gradedSubmissions = recentSubmissions.filter(s => s.status === 'GRADED' && s.score !== null);
    const averageScore = gradedSubmissions.length > 0 
        ? Math.round(gradedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / gradedSubmissions.length) 
        : 0;
    const highestScore = gradedSubmissions.length > 0 
        ? Math.max(...gradedSubmissions.map(s => s.score || 0)) 
        : 0;

    return (
        <div className="w-full">
            <section className="mb-16">
                <div className="flex flex-col lg:flex-row gap-8 items-stretch mb-12">
                    <div className="flex-1 bg-surface border-[4px] border-on-surface brutal-shadow p-6 relative overflow-hidden flex flex-col justify-center">
                        <h2 className="font-headline-xl text-4xl leading-none font-black text-on-surface tracking-tighter uppercase mb-2 relative z-10">
                            {getGreeting()}, <span className="text-primary">{user?.name || user?.email?.split('@')[0] || 'Student'}!</span>
                        </h2>
                        <p className="font-body-lg text-lg text-on-surface-variant font-bold max-w-md relative z-10 uppercase tracking-widest">
                            You have {pendingCount} pending assignment{pendingCount !== 1 ? 's' : ''}.
                        </p>
                    </div>
                    <div className="lg:w-1/3 bg-accent-yellow border-[4px] border-on-surface brutal-shadow flex flex-col">
                        <div className="bg-on-surface text-surface px-6 py-3 font-label-caps text-[11px] tracking-widest uppercase border-b-[4px] border-on-surface flex justify-between items-center font-bold">
                            <span>Status</span>
                            <span className="material-symbols-outlined text-accent-yellow">priority_high</span>
                        </div>
                        <div className="flex-1 p-8 flex flex-col justify-center items-center text-center">
                            <span className={`material-symbols-outlined text-[64px] mb-4 text-on-surface ${pendingCount > 0 ? 'animate-spin' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {pendingCount === 0 ? 'check_circle' : 'sync'}
                            </span>
                            <div className="font-headline-md text-3xl text-on-surface font-black uppercase tracking-tighter">
                                {pendingCount === 0 ? 'All Caught Up' : 'Grading in Progress'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-surface border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between">
                        <span className="font-label-caps uppercase font-bold text-sm tracking-widest mb-2">Total Submissions</span>
                        <span className="font-headline-lg text-4xl font-black uppercase tracking-tighter">{totalSubmissions}</span>
                    </div>
                    <div className="bg-primary text-on-primary border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between">
                        <span className="font-label-caps uppercase font-bold text-sm tracking-widest mb-2 text-on-primary">Average Score</span>
                        <span className="font-headline-lg text-4xl font-black uppercase tracking-tighter text-on-primary">{averageScore}%</span>
                    </div>
                    <div className="bg-secondary text-on-secondary border-[4px] border-on-surface brutal-shadow p-6 flex flex-col justify-between">
                        <span className="font-label-caps uppercase font-bold text-sm tracking-widest mb-2 text-on-secondary">Highest Score</span>
                        <span className="font-headline-lg text-4xl font-black uppercase tracking-tighter text-on-secondary">{highestScore}%</span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                <section>
                    <div className="flex justify-between items-end mb-6 border-b-[4px] border-on-surface pb-2">
                        <h3 className="font-headline-md text-2xl font-black uppercase tracking-tight text-on-surface">Recent Feedback</h3>
                    </div>
                    <div className="space-y-6">
                        {recentSubmissions.slice(0, 3).map(sub => (
                            <div key={sub.id} className="bg-surface border-[4px] border-on-surface brutal-shadow flex flex-col hover:-translate-y-1 transition-transform duration-75 linear">
                                <div className="bg-secondary text-on-secondary px-4 py-2 font-label-caps text-[11px] uppercase tracking-widest border-b-[4px] border-on-surface flex justify-between items-center font-bold">
                                    <span>{sub.assignment?.title}</span>
                                    <span className="material-symbols-outlined text-[16px]">science</span>
                                </div>
                                
                                {sub.status === 'GRADED' ? (
                                    <div className="p-6 flex-1 flex flex-col justify-center items-center bg-secondary-fixed border-b-[4px] border-on-surface">
                                        <div className="font-headline-xl text-[64px] font-black text-on-surface leading-none mb-2 tracking-tighter">
                                            {sub.score}<span className="text-[32px] font-black text-on-surface-variant">/{sub.assignment?.maxScore || 100}</span>
                                        </div>
                                        <div className="font-label-mono text-xs font-bold bg-surface border-[4px] border-on-surface px-4 py-1.5 brutal-shadow uppercase">
                                            {sub.score! >= 90 ? 'Excellent' : 'Graded'}
                                        </div>
                                    </div>
                                ) : sub.status === 'FAILED' ? (
                                    <div className="p-12 flex-1 flex flex-col justify-center items-center bg-error border-b-[4px] border-on-surface">
                                        <div className="font-headline-md text-2xl font-black text-on-error uppercase tracking-widest">
                                            STATUS: FAILED
                                        </div>
                                    </div>
                                ) : (sub.status === 'PENDING' || sub.status === 'REVIEWING') ? (
                                    <div className="p-12 flex-1 flex flex-col justify-center items-center bg-surface-variant border-b-[4px] border-on-surface">
                                        <div className="font-headline-md text-2xl font-black text-on-surface uppercase tracking-widest">
                                            STATUS: PROCESSING
                                        </div>
                                    </div>
                                ) : null}

                                <div className="p-4 bg-surface flex justify-between items-center">
                                    <span className="font-label-mono text-[11px] uppercase font-bold truncate pr-4 text-on-surface-variant">ID: {sub.id.substring(0, 6)}</span>
                                    {sub.status !== 'FAILED' && (
                                        <Button variant="brutal" size="sm" onClick={() => setSelectedSubmission(sub)} disabled={sub.status !== 'GRADED'} aria-label="View feedback">
                                            View Details
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {recentSubmissions.length === 0 && (
                            <div className="border-[4px] border-on-surface border-dashed p-12 text-center bg-surface">
                                <p className="font-headline-md text-3xl font-black uppercase tracking-tighter text-on-surface-variant">
                                    NO FEEDBACK<br />YET
                                </p>
                                <p className="font-label-mono uppercase text-on-surface-variant mt-4 font-bold text-sm">
                                    Submit an assignment to receive grades
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <SubmissionFeedbackModal
                submission={selectedSubmission}
                onClose={() => setSelectedSubmission(null)}
            />
        </div>
    );
};