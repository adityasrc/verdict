import { Router, type Request, type Response } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsyncWrapper.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import generateNumericOTP from "../utils/generateOTP.js";
import { AssignmentManager } from "./assignment.manager.js";
import { createAssignmentSchema } from "../../validators/zod.js";

export class AssignmentController {
    public router = Router();
    private _assignmentManager = new AssignmentManager();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(
            "/",
            authMiddleware,
            requireRole("TEACHER"),
            catchAsync(this.createAssignment.bind(this))
        );

        this.router.get(
            "/teacher/my-assignments",
            authMiddleware,
            requireRole("TEACHER"),
            catchAsync(this.getTeacherAssignments.bind(this))
        );

        this.router.get(
            "/student/all",
            authMiddleware,
            requireRole("STUDENT"),
            catchAsync(this.getStudentAssignments.bind(this))
        );

        this.router.get("/:id", authMiddleware, catchAsync(this.getAssignment.bind(this)));
    }

    private async createAssignment(req: Request, res: Response) {
        const parsed = createAssignmentSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const teacherId = req.user!.id;
        const otp = generateNumericOTP(4);

        const assignment = await this._assignmentManager.createAssignment({
            ...parsed.data,
            otp,
            teacherId,
        });

        return res.status(201).json({ success: true, data: assignment });
    }

    private async getTeacherAssignments(req: Request, res: Response) {
        const teacherId = req.user!.id;
        const assignments = await this._assignmentManager.getAssignmentsByTeacher(teacherId);

        return res.status(200).json({ success: true, data: assignments });
    }

    private async getStudentAssignments(req: Request, res: Response) {
        const assignments = await this._assignmentManager.getAllAssignments();
        return res.status(200).json({ success: true, data: assignments });
    }

    private async getAssignment(req: Request, res: Response) {
        const id = req.params.id as string;
        if (!id) {
            throw new AppError("Assignment ID is required", 400);
        }

        const assignment = await this._assignmentManager.getAssignmentById(id);

        if (!assignment) {
            throw new AppError("Assignment not found", 404);
        }

        return res.status(200).json({ success: true, data: assignment });
    }
}