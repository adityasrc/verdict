import { z } from "zod";


export const registerSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name is required"),
    role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});


export const createAssignmentSchema = z.object({
    title: z.string().min(3, "Title is required"),
    description: z.string().optional(),
    maxScore: z.number().int().positive().default(100),
    requireUniqueId: z.boolean().default(false),
    dueDate: z.coerce.date().optional(),
    rubricId: z.string().uuid("Invalid Rubric ID format").optional(),
});

export const createRubricSchema = z.object({
    name: z.string().min(2, "Rubric name must be at least 2 characters"),
    criteria: z.any(),
});

export const updateRubricSchema = createRubricSchema.partial();


export const createSubmissionSchema = z.object({
    assignmentId: z.string().min(1, "Assignment ID is required"),
    studentUniqueId: z.string().optional(),
});

export const verifyOtpSchema = z.object({
    assignmentId: z.string().min(1, "Assignment ID is required"),
    otp: z.string().min(1, "OTP is required"),
});

export const uploadUrlSchema = z.object({
    fileName: z.string().min(1, "File name is required"),
    type: z.string().min(1, "File type is required"),
    assignmentId: z.string().min(1, "Assignment ID is required"),
});

export const submissionActionSchema = z.object({
    submissionId: z.string().min(1, "Submission ID is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;