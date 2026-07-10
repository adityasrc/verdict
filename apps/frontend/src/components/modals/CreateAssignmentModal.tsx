import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useCreateAssignmentMutation } from '../../features/assignments/assignmentApi';
import { useGetRubricsQuery } from '../../features/rubrics/rubricApi';
import { parseApiError } from '../../lib/errors';

interface CreateAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenRubricManager: () => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({ isOpen, onClose, onOpenRubricManager }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState('100');
    const [selectedRubricId, setSelectedRubricId] = useState<string>('');
    const [requireUniqueId, setRequireUniqueId] = useState(false);

    const { data: rubricsData } = useGetRubricsQuery();
    const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();

        const parsedScore = parseInt(maxScore, 10);
        if (isNaN(parsedScore) || parsedScore <= 0) {
            toast.error('Max score must be a positive number.');
            return;
        }

        try {
            await createAssignment({ 
                title, 
                description, 
                dueDate, 
                maxScore: parsedScore, 
                rubricId: selectedRubricId || undefined, 
                requireUniqueId 
            }).unwrap();
            
            onClose();
            setTitle(''); 
            setDescription(''); 
            setDueDate(''); 
            setSelectedRubricId(''); 
            setRequireUniqueId(false);
            
            toast.success('Assignment created successfully!');
        } catch (error) {
            toast.error(parseApiError(error, 'Failed to create assignment'));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
                                onClick={() => {
                                    onClose();
                                    onOpenRubricManager();
                                }}
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
    );
};
