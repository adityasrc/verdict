import { apiClient } from '../../lib/apiClient';
import type {
    Assignment,
    CreateAssignmentRequest,
    Submission,
    SubmitAssignmentRequest,
} from '../../types';

export const createAssignment = (data: CreateAssignmentRequest) =>
    apiClient<{ success: boolean; data: Assignment }>('/assignments', {
        method: 'POST',
        body: data,
    });

export const getTeacherAssignments = () =>
    apiClient<{ success: boolean; data: Assignment[] }>('/assignments/teacher/my-assignments');

export const getStudentAssignments = () =>
    apiClient<{ success: boolean; data: Assignment[] }>('/assignments/student/all');

export const getAssignment = (id: string) =>
    apiClient<{ success: boolean; data: Assignment }>(`/assignments/${id}`);

export const deleteAssignment = (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/assignments/${id}`, {
        method: 'DELETE',
    });

export const getMySubmissions = () =>
    apiClient<{ success: boolean; data: Submission[] }>('/submissions/my-submissions');

export const getRecentSubmissions = () =>
    apiClient<{ success: boolean; data: Submission[] }>('/submissions/recent');

export const getAssignmentSubmissions = (assignmentId: string) =>
    apiClient<{ success: boolean; data: Submission[] }>(`/submissions/assignment/${assignmentId}`);

export const getUploadUrl = (data: {
    fileName: string;
    fileSize: number;
    type: string;
    assignmentId: string;
    pin?: string;
}) =>
    apiClient<{ success: boolean; data: { url: string; key: string } }>(
        '/submissions/uploadUrl',
        {
            method: 'POST',
            body: data,
        }
    );

export const submitAssignment = (data: SubmitAssignmentRequest) =>
    apiClient<{ success: boolean; data: Submission }>('/submissions', {
        method: 'POST',
        body: data,
    });

export const reEvaluateSubmission = (data: { submissionId: string }) =>
    apiClient<{ success: boolean }>('/submissions/reEvaluate', {
        method: 'POST',
        body: data,
    });

export const deleteSubmission = (data: { submissionId: string }) =>
    apiClient<{ success: boolean }>('/submissions/deleteSubmission', {
        method: 'POST',
        body: data,
    });

export const allowResubmission = deleteSubmission;

export const assignmentApi = {
    createAssignment,
    getTeacherAssignments,
    getStudentAssignments,
    getAssignment,
    deleteAssignment,
    getMySubmissions,
    getRecentSubmissions,
    getAssignmentSubmissions,
    getUploadUrl,
    submitAssignment,
    reEvaluateSubmission,
    deleteSubmission,
    allowResubmission,
};