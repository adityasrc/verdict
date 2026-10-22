import React, { useEffect, useState } from 'react';
import { assignmentApi } from '../../features/assignments/assignmentApi';
import { rubricApi } from '../../features/rubrics/rubricApi';
import type { Rubric } from '../../types';
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
import { DatePicker } from '../ui/date-picker';
import { toast } from 'sonner';
import { parseApiError } from '../../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenRubricManager: () => void;
}

export const CreateAssignmentModal: React.FC<Props> = ({ isOpen, onClose, onOpenRubricManager }) => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateObj, setDueDateObj] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [selectedRubricId, setSelectedRubricId] = useState('');

  useEffect(() => {
    if (isOpen) {
      rubricApi.getRubrics()
        .then((res) => setRubrics(res.data || []))
        .catch((err) => console.error('Failed to fetch rubrics:', err));
    }
  }, [isOpen]);

  const handleClose = () => {
    setTitle(''); setDescription(''); setDueDate('');
    setDueDateObj(undefined); setMaxScore('100'); setSelectedRubricId('');
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
      setIsLoading(true);
      await assignmentApi.createAssignment({
        title,
        description,
        dueDate: dueDate || undefined,
        maxScore: parsedScore,
        rubricId: selectedRubricId,
      });
      toast.success('Assignment created!');
      handleClose();
    } catch (error) {
      toast.error(parseApiError(error, 'Failed to create assignment.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setDueDateObj(date);
    if (date) {
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      setDueDate(endOfDay.toISOString());
    } else {
      setDueDate('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Assignment</DialogTitle>
          <DialogDescription>
            Add assignment details and choose the rubric used to calculate grades.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
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
              className="w-full min-h-20 px-3 py-2 rounded-md bg-canvas border border-border text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:shadow-input-focus transition-colors resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DatePicker
                value={dueDateObj}
                onChange={handleDateChange}
                placeholder="dd/mm/yyyy"
                minDate={new Date()}
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
                className="text-label-sm text-text-secondary hover:text-accent transition-colors"
              >
                Create Rubric
              </button>
            </div>
            {rubrics.length > 0 ? (
              <Select value={selectedRubricId} onValueChange={setSelectedRubricId}>
                <SelectTrigger aria-label="Select a grading rubric">
                  <SelectValue placeholder="Select a rubric" />
                </SelectTrigger>
                <SelectContent>
                  {rubrics.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-border bg-surface-raised/40 p-3">
                <p className="text-body-sm text-text-secondary">Create a rubric before setting up this assignment.</p>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onOpenRubricManager}>
                  Manage rubrics
                </Button>
              </div>
            )}
            {rubrics.length > 0 && (
              <p className="text-xs text-text-muted">If rubric points differ from the maximum score, the final score is scaled to match.</p>
            )}
          </div>

          <Button
            type="submit"
            variant="default"
            disabled={isLoading || !selectedRubricId}
            className="w-full mt-4"
          >
            {isLoading ? 'Creating...' : 'Create Assignment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
