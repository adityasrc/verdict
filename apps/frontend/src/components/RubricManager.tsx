import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    useCreateRubricMutation,
    useDeleteRubricMutation,
    useGetRubricsQuery,
    useUpdateRubricMutation,
} from '../features/rubrics/rubricApi';
import type { RubricCriterion } from '../types';
import { parseApiError } from '../lib/errors';
import { toast } from 'sonner';
import {
    X,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Sliders,
} from 'lucide-react';

const RubricManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data: rubricsData, isLoading } = useGetRubricsQuery();
    const [createRubric, { isLoading: isCreating }] = useCreateRubricMutation();
    const [updateRubric, { isLoading: isUpdating }] = useUpdateRubricMutation();
    const [deleteRubric] = useDeleteRubricMutation();

    const isSubmitting = isCreating || isUpdating;

    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [criteria, setCriteria] = useState<RubricCriterion[]>([
        { name: '', description: '', points: 10 },
    ]);

    const handleAddCriterion = () => {
        setCriteria([...criteria, { name: '', description: '', points: 10 }]);
    };

    const handleRemoveCriterion = (index: number) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleCriterionChange = (
        index: number,
        field: keyof RubricCriterion,
        value: string | number
    ) => {
        const newCriteria = [...criteria];
        newCriteria[index] = { ...newCriteria[index], [field]: value };
        setCriteria(newCriteria);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateRubric({ id: editingId, name, criteria }).unwrap();
                toast.success('Rubric updated.');
            } else {
                await createRubric({ name, criteria }).unwrap();
                toast.success('Rubric created.');
            }
            resetForm();
        } catch (error) {
            toast.error(parseApiError(error, 'Operation failed.'));
        }
    };

    const handleEdit = (rubric: { id: string; name: string; criteria: RubricCriterion[] }) => {
        setEditingId(rubric.id);
        setName(rubric.name);
        setCriteria(rubric.criteria);
        setIsCreatingNew(true);
    };

    const resetForm = () => {
        setIsCreatingNew(false);
        setEditingId(null);
        setName('');
        setCriteria([{ name: '', description: '', points: 10 }]);
    };

    const handleNewRubric = () => {
        resetForm();
        setIsCreatingNew(true);
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await deleteRubric(id).unwrap();
            if (editingId === id) resetForm();
            toast.success('Rubric deleted.');
        } catch (error) {
            toast.error(parseApiError(error, 'Delete failed.'));
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
            <div className="bg-surface w-full max-w-5xl border border-border rounded-xl shadow-elevated flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-5 border-b border-border flex justify-between items-center bg-surface-raised/50 flex-shrink-0">
                    <div>
                        <p className="text-label-sm uppercase tracking-wider text-text-muted font-medium mb-1">Assessment schema</p>
                        <h2 className="text-heading-md font-semibold text-text-primary tracking-tight">
                            Rubric Manager
                        </h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close rubric manager"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border p-5 overflow-y-auto bg-canvas flex flex-col gap-4">
                        <Button variant="default" onClick={handleNewRubric} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            New Rubric
                        </Button>

                        {isLoading ? (
                            <p className="text-center font-mono text-mono-sm uppercase tracking-wider text-text-muted animate-pulse">
                                Loading...
                            </p>
                        ) : rubricsData?.data.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-border rounded-lg">
                                <p className="text-heading-sm font-medium text-text-muted">No rubrics</p>
                                <p className="text-body-sm text-text-muted mt-2">
                                    Create your first rubric above.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {rubricsData?.data.map((rubric) => (
                                    <div
                                        key={rubric.id}
                                        className={`p-4 border rounded-lg flex flex-col gap-3 transition-colors ${
                                            editingId === rubric.id
                                                ? 'bg-surface-raised border-border-strong ring-1 ring-border-strong'
                                                : 'bg-surface border-border hover:border-border-strong'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            className="text-left"
                                            onClick={() => handleEdit(rubric)}
                                        >
                                            <h4 className="text-body-md font-semibold text-text-primary">
                                                {rubric.name}
                                            </h4>
                                            <p className="font-mono text-mono-sm text-text-muted mt-1">
                                                {rubric.criteria.length} criteria
                                            </p>
                                        </button>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="secondary"
                                                size="icon-sm"
                                                className="flex-1"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(rubric); }}
                                                disabled={deletingId === rubric.id}
                                                aria-label="Edit rubric"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="flex-1 text-text-muted hover:text-error"
                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(rubric.id); }}
                                                disabled={deletingId === rubric.id}
                                                aria-label="Delete rubric"
                                            >
                                                {deletingId === rubric.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-5 md:p-8 overflow-y-auto bg-surface">
                        {isCreatingNew ? (
                            <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
                                <div className="mb-8">
                                    <h3 className="text-heading-sm font-semibold text-text-primary tracking-tight mb-5">
                                        {editingId ? 'Edit Rubric' : 'New Rubric'}
                                    </h3>
                                    <div className="space-y-2">
                                        <Label>Rubric Name</Label>
                                        <Input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Essay Rubric, Code Review"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-border pb-4">
                                        <h3 className="text-body-md font-semibold text-text-primary">
                                            Criteria
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleAddCriterion}
                                        >
                                            <Plus className="w-4 h-4 mr-1.5" />
                                            Add Criterion
                                        </Button>
                                    </div>

                                    <div className="space-y-4 pb-6">
                                        {criteria.map((criterion, index) => (
                                            <div
                                                key={index}
                                                className="p-5 border border-border rounded-lg bg-surface-raised/40 card-glow space-y-4 relative"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-surface border border-border px-2 font-mono text-mono-sm text-text-secondary">
                                                        {index + 1}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-text-muted hover:text-error"
                                                        onClick={() => handleRemoveCriterion(index)}
                                                        aria-label="Remove criterion"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="md:col-span-3 space-y-2">
                                                        <Label>Criterion Name</Label>
                                                        <Input
                                                            type="text"
                                                            required
                                                            value={criterion.name}
                                                            onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                                                            placeholder="Criterion Title"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Points</Label>
                                                        <Input
                                                            type="number"
                                                            required
                                                            min="1"
                                                            value={criterion.points}
                                                            onChange={(e) => handleCriterionChange(index, 'points', parseInt(e.target.value, 10) || 0)}
                                                            placeholder="Pts"
                                                            className="text-center font-mono font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Description</Label>
                                                    <textarea
                                                        required
                                                        value={criterion.description}
                                                        onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                                                        className="w-full min-h-[100px] p-3 rounded-md bg-canvas border border-border text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:shadow-input-focus transition-colors resize-y"
                                                        placeholder="Describe what earns full points for this criterion..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-5 border-t border-border mt-auto">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={resetForm}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="default"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </span>
                                        ) : editingId ? 'Save Changes' : 'Create Rubric'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
                                    <Sliders className="w-8 h-8 text-text-muted" />
                                </div>
                                <div>
                                    <h3 className="text-heading-sm font-semibold text-text-primary tracking-tight mb-2">
                                        No rubric selected
                                    </h3>
                                    <p className="text-body-sm text-text-muted">
                                        Create a new rubric or select one to edit.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-surface border border-border rounded-xl shadow-elevated p-6 max-w-sm w-full">
                        <h3 className="text-heading-sm font-semibold text-text-primary mb-2">
                            Delete Rubric?
                        </h3>
                        <p className="text-body-sm text-text-secondary mb-6">
                            This action cannot be undone. Assignments using this rubric will be unaffected.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleDelete(confirmDeleteId)}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RubricManager;
