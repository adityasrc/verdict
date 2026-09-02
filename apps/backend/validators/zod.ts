import { z } from "zod";

export const registerSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(6),
    name: z.string().trim().min(2),
    role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
});

export const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1),
});

export const createAssignmentSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    maxScore: z.number().int().positive().default(100),
    dueDate: z.coerce.date().optional(),
    rubricId: z.uuid().optional(),
});

export const createRubricSchema = z.object({
    name: z.string().min(2),
    criteria: z.array(
        z.object({
            name: z.string().min(1),
            points: z.number().int().positive(),
            description: z.string().min(1),
        })
    ).min(1),
});

export const updateRubricSchema = createRubricSchema.partial();

export const createSubmissionSchema = z.object({
    assignmentId: z.string().min(1),
    fileKey: z.string(),
});

export const uploadUrlSchema = z.object({
    fileName: z.literal("application/pdf"),
    type: z.string().min(1),
    assignmentId: z.uuid(),
    pin: z.string().length(4).optional(),
});

export const submissionActionSchema = z.object({
    submissionId: z.uuid(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;