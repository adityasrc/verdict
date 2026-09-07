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
import { DatePicker } from '../ui/date-picker';
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
  const [dueDateObj, setDueDateObj] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [selectedRubricId, setSelectedRubricId] = useState('');

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
      await createAssignment({
        title,
        description,
        dueDate: dueDate || undefined,
        maxScore: parsedScore,
        rubricId: selectedRubricId && selectedRubricId !== 'none' ? selectedRubricId : undefined,
      }).unwrap();
      toast.success('Assignment created!');
      handleClose();
    } catch (error) {
      toast.error(parseApiError(error, 'Failed to create assignment.'));
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
          <DialogTitle>New Assessment</DialogTitle>
          <DialogDescription>
            Configure assignment details, deadline, and optional grading rubric.
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

          <Button
            type="submit"
            variant="default"
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
