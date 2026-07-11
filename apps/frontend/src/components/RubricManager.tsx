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
        <div className="fixed inset-0 bg-on-surface/80 flex items-center justify-center z-50 backdrop-blur-[2px] p-4">
            <div className="bg-surface w-full max-w-5xl border-[4px] border-on-surface brutal-shadow flex flex-col max-h-[90vh]">

                <div className="p-6 border-b-[4px] border-on-surface flex justify-between items-center bg-accent-yellow flex-shrink-0">
                    <h2 className="font-headline-lg text-headline-lg uppercase font-black tracking-tighter text-on-surface">
                        Rubric Manager
                    </h2>
                    <Button
                        variant="brutal-ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close rubric manager"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    <div className="w-full md:w-1/3 border-b-[4px] md:border-b-0 md:border-r-[4px] border-on-surface p-6 overflow-y-auto bg-surface-variant flex flex-col gap-4">
                        <Button variant="brutal" onClick={handleNewRubric} className="w-full">
                            <span className="material-symbols-outlined">add</span>
                            New Rubric
                        </Button>

                        {isLoading ? (
                            <p className="text-center font-label-mono uppercase font-bold text-on-surface animate-pulse">
                                Loading...
                            </p>
                        ) : rubricsData?.data.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="font-headline-md text-2xl font-black uppercase tracking-tighter text-on-surface-variant">
                                    NO RUBRICS
                                </p>
                                <p className="font-label-mono uppercase text-on-surface-variant mt-2 font-bold text-xs">
                                    Create your first rubric above
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {rubricsData?.data.map((rubric) => (
                                    <div
                                        key={rubric.id}
                                        className={`p-4 border-[4px] border-on-surface flex flex-col gap-3 brutal-shadow transition-transform duration-75 ${
                                            editingId === rubric.id
                                                ? 'bg-secondary-fixed'
                                                : 'bg-surface hover:-translate-y-0.5'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            className="text-left"
                                            onClick={() => handleEdit(rubric)}
                                        >
                                            <h4 className="font-headline-md text-lg uppercase font-bold text-on-surface">
                                                {rubric.name}
                                            </h4>
                                            <p className="font-label-mono text-xs text-on-surface-variant mt-1 uppercase font-bold">
                                                {rubric.criteria.length} criteria
                                            </p>
                                        </button>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="brutal-ghost"
                                                size="icon-sm"
                                                className="flex-1"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(rubric); }}
                                                disabled={deletingId === rubric.id}
                                                aria-label="Edit rubric"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </Button>
                                            <Button
                                                variant="brutal-error"
                                                size="icon-sm"
                                                className="flex-1"
                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(rubric.id); }}
                                                disabled={deletingId === rubric.id}
                                                aria-label="Delete rubric"
                                            >
                                                {deletingId === rubric.id ? (
                                                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-surface">
                        {isCreatingNew ? (
                            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                <div className="mb-8">
                                    <h3 className="font-headline-md text-2xl uppercase font-black text-on-surface tracking-tighter mb-6 inline-block border-b-[4px] border-primary pb-2">
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
                                            className="bg-surface-variant"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4">
                                        <h3 className="font-headline-md text-xl uppercase font-bold text-on-surface">
                                            Criteria
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="brutal"
                                            size="sm"
                                            onClick={handleAddCriterion}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                            Add Criterion
                                        </Button>
                                    </div>

                                    <div className="space-y-6 pb-6">
                                        {criteria.map((criterion, index) => (
                                            <div
                                                key={index}
                                                className="p-6 border-[4px] border-on-surface bg-surface brutal-shadow space-y-4 relative group"
                                            >
                                                {/* Number badge */}
                                                <div className="absolute -top-4 -left-4 bg-on-surface text-surface px-3 py-1 border-[4px] border-surface font-headline-md font-black">
                                                    {index + 1}
                                                </div>
                                                {/* Remove button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCriterion(index)}
                                                    className="absolute -top-4 -right-4 p-2 bg-error text-on-error border-[4px] border-on-surface brutal-shadow brutal-button"
                                                    aria-label="Remove criterion"
                                                >
                                                    <span className="material-symbols-outlined">close</span>
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
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
                                                            onChange={(e) => handleCriterionChange(index, 'points', parseInt(e.target.value))}
                                                            placeholder="Pts"
                                                            className="text-center font-label-mono font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Description</Label>
                                                    <textarea
                                                        required
                                                        value={criterion.description}
                                                        onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                                                        className="w-full p-4 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow resize-y min-h-[100px] transition-colors duration-75"
                                                        placeholder="Describe what earns full points for this criterion..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-6 border-t-[4px] border-on-surface mt-auto">
                                    <Button
                                        type="button"
                                        variant="brutal-ghost"
                                        onClick={resetForm}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="brutal-secondary"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center gap-2">
                                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                                Saving...
                                            </span>
                                        ) : editingId ? 'Save Changes' : 'Create Rubric'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            /* ── Empty Prompt ─────────────────────────────── */
                            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant space-y-6">
                                <div className="border-[4px] border-on-surface border-dashed p-8">
                                    <p className="font-black text-[120px] leading-none tracking-tighter text-on-surface opacity-10 select-none text-center">
                                        R
                                    </p>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-headline-md text-3xl uppercase font-black text-on-surface tracking-tighter mb-2">
                                        NO RUBRIC<br />SELECTED
                                    </h3>
                                    <p className="font-label-mono uppercase font-bold text-sm">
                                        Create a new rubric or select one to edit.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {confirmDeleteId && (
                <div className="fixed inset-0 bg-on-surface/80 flex items-center justify-center z-[60] p-4">
                    <div className="bg-surface border-[4px] border-on-surface brutal-shadow p-8 max-w-sm w-full">
                        <h3 className="font-headline-md text-xl font-black uppercase tracking-tighter mb-2 border-b-[4px] border-on-surface pb-3">
                            Delete Rubric?
                        </h3>
                        <p className="font-body-md text-on-surface-variant mt-3 mb-6">
                            This action cannot be undone. Assignments using this rubric will be unaffected.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="brutal-ghost"
                                className="flex-1"
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="brutal-error"
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
