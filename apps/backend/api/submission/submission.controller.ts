import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { SubmissionManager } from "./submission.manager.js";
import {
    createSubmissionSchema,
    uploadUrlSchema,
    submissionActionSchema,
} from "../../validators/zod.js";

export class SubmissionController {
    static async createSubmission(req: Request, res: Response) {
        const parsed = createSubmissionSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const studentId = req.user!.id;
        const submission = await SubmissionManager.createSubmission({
            studentId,
            ...parsed.data,
        });

        return res.status(201).json({ success: true, data: submission });
    }

    static async getMySubmissions(req: Request, res: Response) {
        const studentId = req.user!.id;
        const submissions = await SubmissionManager.getSubmissionsByStudent(studentId);

        return res.status(200).json({ success: true, data: submissions });
    }

    static async getAssignmentSubmissions(req: Request, res: Response) {
        const assignmentId = req.params.assignmentId as string;
        const teacherId = req.user!.id;

        const submissions = await SubmissionManager.getAssignmentSubmissions(assignmentId, teacherId);
        return res.status(200).json({ success: true, data: submissions });
    }

    static async getUploadUrl(req: Request, res: Response) {
        const parsed = uploadUrlSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const studentId = req.user!.id;
        const { url, key } = await SubmissionManager.presignedUrl({
            studentId,
            ...parsed.data,
        });

        return res.status(200).json({ success: true, data: { url, key } });
    }

    static async getRecentSubmissions(req: Request, res: Response) {
        const userId = req.user!.id;
        const role = req.user!.role;

        const submissions = role === "TEACHER"
            ? await SubmissionManager.getRecentSubmissionsForTeacher(userId)
            : await SubmissionManager.getSubmissionsByStudent(userId);

        return res.status(200).json({ success: true, data: submissions });
    }

    static async deleteSubmission(req: Request, res: Response) {
        const parsed = submissionActionSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const teacherId = req.user!.id;
        await SubmissionManager.deleteSubmission(parsed.data.submissionId, teacherId);
        return res.status(200).json({ success: true, data: null });
    }

    static async allowRevaluate(req: Request, res: Response) {
        const parsed = submissionActionSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const teacherId = req.user!.id;
        await SubmissionManager.allowRevaluate(parsed.data.submissionId, teacherId);
        return res.status(200).json({ success: true, data: null });
    }
}