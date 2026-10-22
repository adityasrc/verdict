import { z } from "zod";
import { MAX_PDF_BYTES } from "../utils/limits.js";

export const registerSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password cannot exceed 72 characters"),
    name: z.string().trim().min(2).max(60, "Name cannot exceed 60 characters"),
    role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
});

export const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(72),
});

export const createAssignmentSchema = z.object({
    title: z.string().trim().min(3).max(120, "Title cannot exceed 120 characters"),
    description: z.string().trim().max(3000, "Description cannot exceed 3000 characters").optional(),
    maxScore: z.number().int().positive().max(1000, "Max score cannot exceed 1000").default(100),
    dueDate: z.coerce.date().optional(),
    rubricId: z.uuid(),
});

export const createRubricSchema = z.object({
    name: z.string().trim().min(2).max(100, "Rubric name cannot exceed 100 characters"),
    criteria: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(80),
                points: z.number().int().positive().max(1000),
                description: z.string().trim().min(1).max(1000),
            })
        )
        .min(1)
        .max(25, "Cannot exceed 25 rubric criteria"),
});

export const updateRubricSchema = createRubricSchema.partial();

export const createSubmissionSchema = z.object({
    assignmentId: z.uuid("Invalid assignment ID"),
    fileKey: z.string(),
    // pin is optional; if provided it must be exactly 4 digits
    pin: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number").optional().or(z.literal("")),
});

export const uploadUrlSchema = z.object({
    fileName: z.string().min(1),
    fileSize: z.number().int().positive().max(MAX_PDF_BYTES, "PDF files must be 10 MB or smaller"),
    type: z.literal("application/pdf"),
    assignmentId: z.uuid(),
    // pin is optional; if provided it must be exactly 4 digits
    pin: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number").optional().or(z.literal("")),
});

export const submissionActionSchema = z.object({
    submissionId: z.uuid(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;