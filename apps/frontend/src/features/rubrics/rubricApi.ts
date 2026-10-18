import { apiClient } from '../../lib/apiClient';
import type { Rubric, RubricCriterion } from '../../types';

export const getRubrics = () =>
    apiClient<{ success: boolean; data: Rubric[] }>('/rubrics');

export const getRubric = (id: string) =>
    apiClient<{ success: boolean; data: Rubric }>(`/rubrics/${id}`);

export const createRubric = (data: { name: string; criteria: RubricCriterion[] }) =>
    apiClient<{ success: boolean; data: Rubric }>('/rubrics', {
        method: 'POST',
        body: data,
    });

export const updateRubric = (id: string, data: { name?: string; criteria?: RubricCriterion[] }) =>
    apiClient<{ success: boolean; data: Rubric }>(`/rubrics/${id}`, {
        method: 'PUT',
        body: data,
    });

export const deleteRubric = (id: string) =>
    apiClient<{ success: boolean }>(`/rubrics/${id}`, {
        method: 'DELETE',
    });

export const rubricApi = {
    getRubrics,
    getRubric,
    createRubric,
    updateRubric,
    deleteRubric,
};