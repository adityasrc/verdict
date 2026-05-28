import { Award, Edit, Plus, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
                toast.success('Matrix updated.');
            } else {
                await createRubric({ name, criteria }).unwrap();
                toast.success('Matrix deployed.');
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
        if (confirm('Purge this matrix?')) {
            try {
                setDeletingId(id);
                await deleteRubric(id).unwrap();
                if (editingId === id) {
                    resetForm();
                }
                toast.success('Matrix purged.');
            } catch (error) {
                console.error('Purge failed', error);
                toast.error('Purge failed.');
            } finally {
                setDeletingId(null);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#09090b] rounded-2xl w-full max-w-4xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight">Evaluation Matrices</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto bg-gray-50/50 dark:bg-black/20">
                        <Button
                            onClick={handleNewRubric}
                            className="w-full mb-4 gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4" /> Initialize Matrix
                        </Button>

                        {isLoading ? (
                            <p className="text-center text-gray-500 font-mono text-sm">Loading...</p>
                        ) : (
                            <div className="space-y-2">
                                {rubricsData?.data.map((rubric) => (
                                    <div
                                        key={rubric.id}
                                        className={`p-3 rounded-lg border flex justify-between items-center group transition-colors ${
                                            editingId === rubric.id
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                                : 'border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800/50'
                                        }`}>
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => handleEdit(rubric)}>
                                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{rubric.name}</h4>
                                            <p className="text-xs text-gray-500 font-mono mt-1">
                                                {rubric.criteria.length} nodes
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(rubric);
                                                }}
                                                disabled={deletingId === rubric.id}
                                                className="p-1.5 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded disabled:opacity-50 transition-colors">
                                                <Edit className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(rubric.id);
                                                }}
                                                disabled={deletingId === rubric.id}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50 transition-colors">
                                                {deletingId === rubric.id ? (
                                                    <div className="h-3.5 w-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {isCreatingNew ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold tracking-tight">
                                        {editingId ? 'Modify Matrix' : 'Configure New Matrix'}
                                    </h3>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                        Identifier
                                    </label>
                                    <Input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Matrix Designation"
                                        className="bg-gray-50 dark:bg-black/50"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Evaluation Nodes</h3>
                                        <button
                                            type="button"
                                            onClick={handleAddCriterion}
                                            className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium flex items-center gap-1 transition-colors">
                                            <Plus className="h-3.5 w-3.5" /> Append Node
                                        </button>
                                    </div>

                                    {criteria.map((criterion, index) => (
                                        <div
                                            key={index}
                                            className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#09090b] space-y-3 relative group">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCriterion(index)}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                <X className="h-3 w-3" />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div className="md:col-span-3">
                                                    <Input
                                                        type="text"
                                                        required
                                                        value={criterion.name}
                                                        onChange={(e) =>
                                                            handleCriterionChange(index, 'name', e.target.value)
                                                        }
                                                        placeholder="Node Name"
                                                        className="bg-white dark:bg-black"
                                                    />
                                                </div>
                                                <div>
                                                    <Input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={criterion.points}
                                                        onChange={(e) =>
                                                            handleCriterionChange(index, 'points', parseInt(e.target.value))
                                                        }
                                                        placeholder="Weight"
                                                        className="bg-white dark:bg-black font-mono text-center"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                required
                                                value={criterion.description}
                                                onChange={(e) =>
                                                    handleCriterionChange(index, 'description', e.target.value)
                                                }
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                                placeholder="Execution standard..."
                                                rows={2}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                        disabled={isSubmitting}>
                                        Abort
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
                                        {isSubmitting ? (
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : editingId ? (
                                            'Update Matrix'
                                        ) : (
                                            'Deploy Matrix'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-600">
                                <Award className="h-16 w-16 mb-4 opacity-20" />
                                <p className="font-medium text-gray-900 dark:text-gray-300">No active matrix selected.</p>
                                <p className="text-sm mt-1">
                                    Initialize a new matrix or select one to modify.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RubricManager;