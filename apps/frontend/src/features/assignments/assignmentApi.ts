import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../app/baseQuery';
import type {
    Assignment,
    CreateAssignmentRequest,
    Submission,
} from '../../types';

export const assignmentApi = createApi({
    reducerPath: 'assignmentApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Assignment', 'Submission'],
    endpoints: (builder) => ({
        createAssignment: builder.mutation<
            { success: boolean; data: Assignment },
            CreateAssignmentRequest
        >({
            query: (data) => ({
                url: '/assignments',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assignment'],
        }),
        getTeacherAssignments: builder.query<{ success: boolean; data: Assignment[] }, void>({
            query: () => '/assignments/teacher/my-assignments',
            providesTags: ['Assignment'],
        }),
        getStudentAssignments: builder.query<{ success: boolean; data: Assignment[] }, void>({
            query: () => '/assignments/student/all',
            providesTags: ['Assignment'],
        }),
        getAssignment: builder.query<{ success: boolean; data: Assignment }, string>({
            query: (id) => `/assignments/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Assignment', id }],
        }),
        getMySubmissions: builder.query<{ success: boolean; data: Submission[] }, void>({
            query: () => '/submissions/my-submissions',
            providesTags: ['Submission'],
        }),
        getRecentSubmissions: builder.query<{ success: boolean; data: Submission[] }, void>({
            query: () => '/submissions/recent',
            providesTags: ['Submission'],
        }),
        getAssignmentSubmissions: builder.query<{ success: boolean; data: Submission[] }, string>({
            query: (assignmentId) => `/submissions/assignment/${assignmentId}`,
            providesTags: ['Submission'],
        }),
        getUploadUrl: builder.query<
            { success: boolean; data: { url: string; key: string } },
            { fileName: string; type: string; assignmentId: string; pin?: string }
        >({
            query: ({ fileName, type, assignmentId, pin }) => ({
                url: '/submissions/uploadUrl',
                method: 'GET',
                params: { fileName, type, assignmentId, ...(pin ? { pin } : {}) },
            }),
        }),
        submitAssignment: builder.mutation<
            { success: boolean; data: Submission },
            { assignmentId: string; fileKey: string }
        >({
            query: (body) => ({
                url: '/submissions/',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['Submission'],
        }),
        reEvaluateSubmission: builder.mutation<{ success: boolean }, { submissionId: string }>({
            query: (body) => ({
                url: '/submissions/reEvaluate',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['Submission'],
        }),
        allowResubmission: builder.mutation<{ success: boolean }, { submissionId: string }>({
            query: (body) => ({
                url: '/submissions/allowResubmission',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['Submission'],
        }),
        deleteAssignment: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `/assignments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Assignment', 'Submission'],
        }),
    }),
});

export const {
    useCreateAssignmentMutation,
    useGetTeacherAssignmentsQuery,
    useGetStudentAssignmentsQuery,
    useGetAssignmentQuery,
    useGetMySubmissionsQuery,
    useGetRecentSubmissionsQuery,
    useGetAssignmentSubmissionsQuery,
    useLazyGetUploadUrlQuery,
    useSubmitAssignmentMutation,
    useReEvaluateSubmissionMutation,
    useAllowResubmissionMutation,
    useDeleteAssignmentMutation,
} = assignmentApi;