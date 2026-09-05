export interface User {
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'TEACHER';
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
        accessToken: string;
        refreshToken: string;
    };
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    role?: 'STUDENT' | 'TEACHER';
}

export interface RubricCriterion {
    name: string;
    description: string;
    points: number;
}

export interface Rubric {
    id: string;
    name: string;
    criteria: RubricCriterion[];
    teacherId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    maxScore: number;
    dueDate?: string;
    teacherId: string;
    createdAt: string;
    updatedAt: string;
    // accessPin is only present when the teacher fetches their own assignments.
    // The student-facing API route intentionally omits this field.
    accessPin?: string | null;
    _count?: {
        submissions: number;
    };
    rubricId?: string;
    rubric?: Rubric;
}

export interface CreateAssignmentRequest {
    title: string;
    description?: string;
    maxScore?: number;
    dueDate?: string;
    rubricId?: string;
}

// EVALUATING added — this is the status emitted by the worker during AI processing.
// Was missing from types, causing UI to not handle this state correctly.
export type SubmissionStatus = 'PENDING' | 'EVALUATING' | 'GRADED' | 'FAILED';

// Structured JSON object that Gemini returns inside the feedback field.
export interface GeminiFeedback {
    score: number;
    strengths: string[];
    weaknesses: string[];
    feedback: string;
    summary: string;
}

export interface Submission {
    id: string;
    // content and publicUrl removed — these fields do not exist in the Prisma schema.
    // content was a phantom field. publicUrl is derived at runtime in the worker, not stored.
    score?: number | null;
    feedback?: GeminiFeedback | string | null; // Gemini returns structured JSON stored as Prisma Json type
    status: SubmissionStatus;
    submittedAt: string;
    gradedAt?: string | null;
    studentId: string;
    assignmentId: string;
    fileKey: string;
    student?: {
        name: string;
        email: string;
    };
    assignment?: {
        title: string;
        dueDate: string;
        maxScore: number;
    };
}

export interface CreateSubmissionRequest {
    // content removed — backend does not accept this field
    assignmentId: string;
}

export interface SubmitAssignmentRequest {
    assignmentId: string;
    fileKey: string;
}