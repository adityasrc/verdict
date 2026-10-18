import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { AssignmentManager } from "./assignment.manager.js";
import { createAssignmentSchema } from "../../validators/zod.js";

export class AssignmentController {
    static async createAssignment(req: Request, res: Response) {
        const parsed = createAssignmentSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const teacherId = req.user!.id;

        const assignment = await AssignmentManager.createAssignment({
            ...parsed.data,
            teacherId,
        });

        return res.status(201).json({ success: true, data: assignment });
    }

    static async getTeacherAssignments(req: Request, res: Response) {
        const teacherId = req.user!.id;
        const assignments = await AssignmentManager.getAssignmentsByTeacher(teacherId);

        return res.status(200).json({ success: true, data: assignments });
    }

    static async getStudentAssignments(req: Request, res: Response) {
        const assignments = await AssignmentManager.getAllStudentAssignments();
        return res.status(200).json({ success: true, data: assignments });
    }

    static async getAssignment(req: Request, res: Response) {
        const id = req.params.id as string;
        if (!id) {
            throw new AppError("Assignment ID is required", 400);
        }

        const assignment = await AssignmentManager.getAssignmentById(id);
        if (!assignment) {
            throw new AppError("Assignment not found", 404);
        }

        return res.status(200).json({ success: true, data: assignment });
    }

    static async deleteAssignment(req: Request, res: Response) {
        const id = req.params.id as string;
        if (!id) {
            throw new AppError("Assignment ID is required", 400);
        }

        const teacherId = req.user!.id;
        await AssignmentManager.deleteAssignment(id, teacherId);

        return res.status(200).json({ success: true, message: "Assignment deleted successfully" });
    }
}