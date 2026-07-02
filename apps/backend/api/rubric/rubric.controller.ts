import { Router, type Request, type Response } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsyncWrapper.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import { RubricManager } from "./rubric.manager.js";
import { createRubricSchema, updateRubricSchema } from "../../validators/zod.js";

export class RubricController {
    public router = Router();
    private _rubricManager = new RubricManager();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(authMiddleware, requireRole("TEACHER"));

        this.router.post("/", catchAsync(this.createRubric.bind(this)));
        this.router.get("/", catchAsync(this.getRubrics.bind(this)));
        this.router.get("/:id", catchAsync(this.getRubric.bind(this)));
        this.router.put("/:id", catchAsync(this.updateRubric.bind(this)));
        this.router.delete("/:id", catchAsync(this.deleteRubric.bind(this)));
    }

    private async createRubric(req: Request, res: Response) {
        const parsed = createRubricSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const teacherId = req.user!.id;

        const rubric = await this._rubricManager.createRubric({
            ...parsed.data,
            teacherId,
        });

        return res.status(201).json({ success: true, data: rubric });
    }

    private async getRubrics(req: Request, res: Response) {
        const teacherId = req.user!.id;
        const rubrics = await this._rubricManager.getRubricsByTeacher(teacherId);

        return res.status(200).json({ success: true, data: rubrics });
    }

    private async getRubric(req: Request, res: Response) {
        const id = req.params.id as string;

        if (!id) {
            throw new AppError("Rubric ID is required", 400);
        }

        const rubric = await this._rubricManager.getRubricById(id);

        if (!rubric) {
            throw new AppError("Rubric not found", 404);
        }

        return res.status(200).json({ success: true, data: rubric });
    }

    private async updateRubric(req: Request, res: Response) {
        const id = req.params.id as string;

        if (!id) {
            throw new AppError("Rubric ID is required", 400);
        }

        const parsed = updateRubricSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const rubric = await this._rubricManager.updateRubric(id, parsed.data);
        return res.status(200).json({ success: true, data: rubric });
    }

    private async deleteRubric(req: Request, res: Response) {
        const id = req.params.id as string;

        if (!id) {
            throw new AppError("Rubric ID is required", 400);
        }

        await this._rubricManager.deleteRubric(id);
        return res.status(200).json({ success: true, data: null });
    }
}