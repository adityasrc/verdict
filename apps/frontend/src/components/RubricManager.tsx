import React, { useState } from 'react';
import {
    useCreateRubricMutation,
    useDeleteRubricMutation,
    useGetRubricsQuery,
    useUpdateRubricMutation,
} from '../features/rubrics/rubricApi';
import type { RubricCriterion } from '../types';
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
            console.error('Operation failed', error);
            toast.error('Operation failed.');
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
        if (confirm('Delete this rubric?')) {
            try {
                setDeletingId(id);
                await deleteRubric(id).unwrap();
                if (editingId === id) {
                    resetForm();
                }
                toast.success('Rubric deleted.');
            } catch (error) {
                console.error('Delete failed', error);
                toast.error('Delete failed.');
            } finally {
                setDeletingId(null);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-on-surface/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-surface w-full max-w-5xl border-[4px] border-on-surface brutal-shadow flex flex-col max-h-[90vh]">
                <div className="p-6 border-b-[4px] border-on-surface flex justify-between items-center bg-accent-yellow">
                    <h2 className="font-headline-lg text-headline-lg uppercase font-black tracking-tighter text-on-surface">Rubric Manager</h2>
                    <button
                        onClick={onClose}
                        className="p-2 border-[4px] border-on-surface bg-surface text-on-surface brutal-shadow hover:bg-error hover:text-on-error transition-colors brutal-button flex items-center justify-center">
                        <span className="material-symbols-outlined font-bold">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar */}
                    <div className="w-full md:w-1/3 border-b-[4px] md:border-b-0 md:border-r-[4px] border-on-surface p-6 overflow-y-auto bg-surface-variant flex flex-col gap-6">
                        <button
                            onClick={handleNewRubric}
                            className="w-full py-4 bg-primary text-on-primary border-[4px] border-on-surface brutal-shadow brutal-button font-label-caps uppercase font-bold flex items-center justify-center gap-2 hover:bg-primary-container">
                            <span className="material-symbols-outlined">add</span> New Rubric
                        </button>

                        {isLoading ? (
                            <p className="text-center font-label-mono uppercase font-bold text-on-surface animate-pulse">Loading...</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {rubricsData?.data.map((rubric) => (
                                    <div
                                        key={rubric.id}
                                        className={`p-4 border-[4px] border-on-surface flex flex-col gap-4 group transition-colors brutal-shadow ${
                                            editingId === rubric.id
                                                ? 'bg-secondary-fixed'
                                                : 'bg-surface hover:-translate-y-1'
                                        }`}>
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => handleEdit(rubric)}>
                                            <h4 className="font-headline-md text-lg uppercase font-bold text-on-surface">{rubric.name}</h4>
                                            <p className="font-label-mono text-xs text-on-surface-variant mt-1 uppercase font-bold">
                                                {rubric.criteria.length} criteria
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(rubric);
                                                }}
                                                disabled={deletingId === rubric.id}
                                                className="flex-1 py-2 border-[2px] border-on-surface bg-surface text-on-surface font-label-caps text-xs uppercase font-bold hover:bg-accent-yellow transition-colors brutal-button flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(rubric.id);
                                                }}
                                                disabled={deletingId === rubric.id}
                                                className="flex-1 py-2 border-[2px] border-on-surface bg-error text-on-error font-label-caps text-xs uppercase font-bold hover:bg-red-700 transition-colors brutal-button flex items-center justify-center disabled:opacity-50">
                                                {deletingId === rubric.id ? (
                                                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-surface">
                        {isCreatingNew ? (
                            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                <div className="mb-8">
                                    <h3 className="font-headline-md text-2xl uppercase font-black text-on-surface tracking-tighter mb-6 inline-block border-b-[4px] border-primary pb-2">
                                        {editingId ? 'Edit Rubric' : 'New Rubric'}
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="block font-label-caps uppercase font-bold text-on-surface">
                                            Rubric Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Essay Rubric, Code Review"
                                            className="w-full h-12 px-4 border-[4px] border-on-surface bg-surface-variant font-body-md focus:outline-none focus:border-primary brutal-shadow transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="flex justify-between items-end border-b-[4px] border-on-surface pb-4">
                                        <h3 className="font-headline-md text-xl uppercase font-bold text-on-surface">Criteria</h3>
                                        <button
                                            type="button"
                                            onClick={handleAddCriterion}
                                            className="px-4 py-2 bg-primary text-on-primary border-[4px] border-on-surface font-label-caps text-xs uppercase font-bold brutal-shadow brutal-button hover:bg-primary-container flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">add</span> Add Criterion
                                        </button>
                                    </div>

                                    <div className="space-y-6 pb-6">
                                        {criteria.map((criterion, index) => (
                                            <div
                                                key={index}
                                                className="p-6 border-[4px] border-on-surface bg-surface brutal-shadow space-y-4 relative group">
                                                <div className="absolute -top-4 -left-4 bg-on-surface text-surface px-3 py-1 border-[4px] border-surface font-headline-md font-black">
                                                    {index + 1}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCriterion(index)}
                                                    className="absolute -top-4 -right-4 p-2 bg-error text-on-error border-[4px] border-on-surface brutal-shadow brutal-button opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined font-bold">close</span>
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
                                                    <div className="md:col-span-3 space-y-2">
                                                        <label className="block font-label-caps text-xs uppercase font-bold text-on-surface">Criterion Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={criterion.name}
                                                            onChange={(e) =>
                                                                handleCriterionChange(index, 'name', e.target.value)
                                                            }
                                                            placeholder="Criterion Title"
                                                            className="w-full h-12 px-4 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block font-label-caps text-xs uppercase font-bold text-on-surface">Points</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            min="1"
                                                            value={criterion.points}
                                                            onChange={(e) =>
                                                                handleCriterionChange(index, 'points', parseInt(e.target.value))
                                                            }
                                                            placeholder="Points"
                                                            className="w-full h-12 px-4 border-[4px] border-on-surface bg-surface font-label-mono text-center font-bold focus:outline-none focus:border-primary brutal-shadow"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block font-label-caps text-xs uppercase font-bold text-on-surface">Description</label>
                                                    <textarea
                                                        required
                                                        value={criterion.description}
                                                        onChange={(e) =>
                                                            handleCriterionChange(index, 'description', e.target.value)
                                                        }
                                                        className="w-full p-4 border-[4px] border-on-surface bg-surface font-body-md focus:outline-none focus:border-primary brutal-shadow resize-y min-h-[100px]"
                                                        placeholder="Describe what earns full points for this criterion..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-8 border-t-[4px] border-on-surface mt-auto">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={isSubmitting}
                                        className="px-8 py-3 bg-surface-variant border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-surface disabled:opacity-50">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-8 py-3 bg-secondary text-on-secondary border-[4px] border-on-surface font-label-caps uppercase font-bold tracking-widest brutal-shadow brutal-button hover:bg-emerald-500 disabled:opacity-50">
                                        {isSubmitting ? (
                                            <span className="flex items-center gap-2">
                                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                                Saving...
                                            </span>
                                        ) : editingId ? (
                                            'Save Changes'
                                        ) : (
                                            'Create Rubric'
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant space-y-6">
                                <div className="p-8 border-[4px] border-on-surface border-dashed">
                                    <span className="material-symbols-outlined text-7xl opacity-50 block mb-4">analytics</span>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-headline-md text-2xl uppercase font-black text-on-surface mb-2">No Rubric Selected</h3>
                                    <p className="font-body-md uppercase font-bold">Create a new rubric or select one to edit.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RubricManager;