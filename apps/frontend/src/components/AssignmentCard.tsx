import React from 'react';
import { Share2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import type { Assignment } from '../types';

interface AssignmentCardProps {
    assignment: Assignment;
    onShare: (id: string, pin?: string | null) => void;
    onDelete: (id: string) => void;
    onReview: (id: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
    assignment,
    onShare,
    onDelete,
    onReview,
}) => {
    return (
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-interactive hover:bg-surface-raised/40 transition-colors">
            <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                    <h3
                        className="text-sm font-semibold text-text-primary truncate max-w-sm sm:max-w-md"
                        title={assignment.title}
                    >
                        {assignment.title}
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-text-muted">
                    <span className="uppercase tracking-wider">Submissions: {assignment._count?.submissions || 0}</span>
                    <span className="text-border">·</span>
                    <span className="uppercase tracking-wider">Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Open'}</span>
                    {assignment.accessPin && (
                        <>
                            <span className="text-border">·</span>
                            <span>
                                PIN: <strong className="text-text-primary tracking-widest font-bold ml-1">{assignment.accessPin}</strong>
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onReview(assignment.id)}
                >
                    Review
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onShare(assignment.id, assignment.accessPin)}
                    aria-label="Copy link and PIN"
                >
                    <Share2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-muted hover:text-error"
                    onClick={() => onDelete(assignment.id)}
                    aria-label="Delete assessment"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
};
