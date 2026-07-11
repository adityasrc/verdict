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

    return (
        <div className="w-full">
            <section className="mb-16">
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                    <div className="flex-1 bg-surface border-[4px] border-on-surface brutal-shadow p-8 lg:p-12 relative overflow-hidden">
                        <div className="absolute -right-16 -top-16 w-64 h-64 border-[4px] border-on-surface rounded-full opacity-10 pointer-events-none" />
                        <h2 className="font-headline-xl text-4xl md:text-5xl lg:text-[80px] leading-none font-black text-on-surface tracking-tighter uppercase mb-4 relative z-10">
                            {getGreeting()},<br />
                            <span className="text-primary">
                                {user?.name || user?.email?.split('@')[0] || 'Student'}!
                            </span>
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
                            <span className="material-symbols-outlined text-[64px] mb-4 text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {pendingCount === 0 ? 'check_circle' : 'pending_actions'}
                            </span>
                            <div className="font-headline-md text-3xl text-on-surface font-black uppercase tracking-tighter">
                                {pendingCount === 0 ? 'All Caught Up' : 'Action Required'}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                <section>
                    <div className="flex justify-between items-end mb-6 border-b-[4px] border-on-surface pb-2">
                        <h3 className="font-headline-md text-2xl font-black uppercase tracking-tight text-on-surface">Recent Feedback</h3>
                    </div>
                    <div className="space-y-6">
                        {recentSubmissions.filter(s => s.status === 'GRADED').slice(0, 3).map(sub => (
                            <div key={sub.id} className="bg-surface border-[4px] border-on-surface brutal-shadow flex flex-col hover:-translate-y-1 transition-transform duration-75 linear">
                                <div className="bg-secondary text-on-secondary px-4 py-2 font-label-caps text-[11px] uppercase tracking-widest border-b-[4px] border-on-surface flex justify-between items-center font-bold">
                                    <span>{sub.assignment?.title}</span>
                                    <span className="material-symbols-outlined text-[16px]">science</span>
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-center items-center bg-secondary-fixed border-b-[4px] border-on-surface">
                                    <div className="font-headline-xl text-[64px] font-black text-on-surface leading-none mb-2 tracking-tighter">
                                        {sub.score}<span className="text-[32px] font-black text-on-surface-variant">/{sub.assignment?.maxScore || 100}</span>
                                    </div>
                                    <div className="font-label-mono text-xs font-bold bg-surface border-[4px] border-on-surface px-4 py-1.5 brutal-shadow uppercase">
                                        {sub.score! >= 90 ? 'Excellent' : 'Graded'}
                                    </div>
                                </div>
                                <div className="p-4 bg-surface flex justify-between items-center">
                                    <span className="font-label-mono text-[11px] uppercase font-bold truncate pr-4 text-on-surface-variant">ID: {sub.id.substring(0, 6)}</span>
                                    <Button variant="brutal" size="sm" onClick={() => setSelectedSubmission(sub)} aria-label="View feedback">
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {recentSubmissions.filter(s => s.status === 'GRADED').length === 0 && (
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