import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import type { Submission } from '../../types';

interface SubmissionFeedbackModalProps {
    submission: Submission | null;
    onClose: () => void;
}

export const SubmissionFeedbackModal: React.FC<SubmissionFeedbackModalProps> = ({ submission, onClose }) => {
    return (
        <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Feedback Summary</DialogTitle>
                </DialogHeader>
                {submission && (
                    <div className="space-y-6 mt-4 font-body-md">
                        <div className="bg-secondary-fixed border-[4px] border-on-surface p-4 brutal-shadow inline-block">
                            <h3 className="font-label-caps text-label-caps uppercase font-bold mb-1">Score</h3>
                            <div className="font-headline-lg font-black text-on-surface">
                                {submission.score}
                                <span className="text-headline-md">/{submission.assignment?.maxScore || 100}</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-label-caps text-label-caps uppercase font-bold mb-2">AI Analysis</h3>
                            <div className="bg-surface-variant border-[4px] border-on-surface p-4 prose max-w-none text-on-surface brutal-shadow">
                                <ReactMarkdown>{submission.feedback || 'No feedback.'}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
