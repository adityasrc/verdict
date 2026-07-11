import React, { useState } from 'react';
import { useCreateAssignmentMutation } from '../../features/assignments/assignmentApi';
import { useGetRubricsQuery } from '../../features/rubrics/rubricApi';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { parseApiError } from '../../lib/errors';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenRubricManager: () => void;
}

export const CreateAssignmentModal: React.FC<Props> = ({ isOpen, onClose, onOpenRubricManager }) => {
  const [createAssignment, { isLoading }] = useCreateAssignmentMutation();
  const { data: rubricsData } = useGetRubricsQuery();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [requireUniqueId, setRequireUniqueId] = useState(false);

  const handleClose = () => {
    setTitle(''); setDescription(''); setDueDate('');
    setMaxScore('100'); setSelectedRubricId(''); setRequireUniqueId(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedScore = parseInt(maxScore, 10);
    if (isNaN(parsedScore) || parsedScore < 1) {
      toast.error('Max score must be a valid number.');
      return;
    }
    try {
      await createAssignment({
        title,
        description,
        dueDate,
        maxScore: parsedScore,
        rubricId: selectedRubricId && selectedRubricId !== 'none' ? selectedRubricId : undefined,
        requireUniqueId,
      }).unwrap();
      toast.success('Assignment created!');
      handleClose();
    } catch (error) {
      toast.error(parseApiError(error, 'Failed to create assignment.'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-surface border-[4px] border-on-surface text-on-surface brutal-shadow rounded-none">
        <DialogHeader>
          <DialogTitle className="font-headline-md font-black uppercase">New Assessment</DialogTitle>
          <DialogDescription className="font-body-md text-on-surface-variant">Fill details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="a-title">Title</Label>
            <Input
              id="a-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-description">Instructions</Label>
            <textarea
              id="a-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="a-due">Due Date</Label>
              <Input
                id="a-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-score">Max Score</Label>
              <Input
                id="a-score"
                type="number"
                required
                min={1}
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
                onClick={onOpenRubricManager}
                className="text-xs text-primary font-bold hover:underline"
              >
                Create Rubric
              </button>
            </div>
            <Select value={selectedRubricId} onValueChange={setSelectedRubricId}>
              <SelectTrigger>
                <SelectValue placeholder="No rubric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Rubric</SelectItem>
                {rubricsData?.data.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              id="a-require-id"
              type="checkbox"
              checked={requireUniqueId}
              onChange={(e) => setRequireUniqueId(e.target.checked)}
              className="w-5 h-5 border-[3px] border-on-surface bg-surface accent-primary cursor-pointer"
            />
            <Label htmlFor="a-require-id" className="cursor-pointer">
              Require student university ID
            </Label>
          </div>

          <Button
            type="submit"
            variant="brutal"
            disabled={isLoading}
            className="w-full mt-4"
          >
            {isLoading ? 'Creating...' : 'Create Assignment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};