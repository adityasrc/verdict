import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { RubricManager } from "./rubric.manager.js";
import { createRubricSchema, updateRubricSchema } from "../../validators/zod.js";

export class RubricController {
    static async createRubric(req: Request, res: Response) {
        const parsed = createRubricSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const rubric = await RubricManager.createRubric({
            ...parsed.data,
            teacherId: req.user!.id,
        });

        return res.status(201).json({ success: true, data: rubric });
    }

    static async getRubrics(req: Request, res: Response) {
        const rubrics = await RubricManager.getRubricsByTeacher(req.user!.id);
        return res.status(200).json({ success: true, data: rubrics });
    }

    static async getRubric(req: Request, res: Response) {
        const id = req.params.id as string;
        const rubric = await RubricManager.getRubricById(id, req.user!.id);

        if (!rubric) {
            throw new AppError("Rubric not found", 404);
        }

        return res.status(200).json({ success: true, data: rubric });
    }

    static async updateRubric(req: Request, res: Response) {
        const id = req.params.id as string;
        const parsed = updateRubricSchema.safeParse(req.body);

        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const rubric = await RubricManager.updateRubric(id, req.user!.id, parsed.data);
        return res.status(200).json({ success: true, data: rubric });
    }

    static async deleteRubric(req: Request, res: Response) {
        const id = req.params.id as string;
        await RubricManager.deleteRubric(id, req.user!.id);

        return res.status(200).json({ success: true, data: null });
    }
}