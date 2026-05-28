export interface User {
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
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
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
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
    requireUniqueId?: boolean;
    teacherId: string;
    createdAt: string;
    updatedAt: string;
    otp: string;
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
    requireUniqueId?: boolean;
}

export interface Submission {
    id: string;
    content: string;
    score?: number;
    feedback?: string;
    status: 'PENDING' | 'GRADED' | 'REVIEWING';
    submittedAt: string;
    gradedAt?: string;
    studentId: string;
    assignmentId: string;
    publicUrl: string;
    fileKey: string;
    studentUniqueId?: string;
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
    content?: string;
    assignmentId: string;
}