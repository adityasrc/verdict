import { Router, type Request, type Response } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsyncWrapper.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import { prisma } from "../../utils/db.js";
import { submissionQueue } from "../../utils/queue.js";
import { getIO } from "../../ws/index.js";
import { SubmissionManager } from "./submission.manager.js";
import {
    createSubmissionSchema,
    verifyOtpSchema,
    uploadUrlSchema,
    submissionActionSchema
} from "../../validators/zod.js";
import { Prisma } from "@prisma/client";
import rateLimit from "express-rate-limit";

export class SubmissionController {
    public router = Router();
    private _submissionManager = new SubmissionManager();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(authMiddleware);

        const otpLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            limit: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes).
            message: "Too many OTP attempts, please try again after 15 minutes",
            standardHeaders: 'draft-8',
            legacyHeaders: false,
        });

        this.router.post("/", requireRole("STUDENT"), catchAsync(this.createSubmission.bind(this)));
        this.router.post("/verifyAssignmentOtp", requireRole("STUDENT"), otpLimiter, catchAsync(this.verifyAssignmentOtp.bind(this)));
        this.router.get("/uploadUrl", requireRole("STUDENT"), catchAsync(this.getUploadUrl.bind(this)));
        this.router.get("/my-submissions", requireRole("STUDENT"), catchAsync(this.getMySubmissions.bind(this)));

        this.router.get("/assignment/:assignmentId", requireRole("TEACHER"), catchAsync(this.getAssignmentSubmissions.bind(this)));
        this.router.post("/reEvaluate", requireRole("TEACHER"), catchAsync(this.allowRevaluate.bind(this)));
        this.router.post("/allowResubmission", requireRole("TEACHER"), catchAsync(this.allowResubmission.bind(this)));

        this.router.get("/recent", catchAsync(this.getRecentSubmissions.bind(this)));
    }

    private async createSubmission(req: Request, res: Response) {
        const parsed = createSubmissionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const studentId = req.user!.id;
        const { assignmentId, studentUniqueId } = parsed.data;

        const submission = await this._submissionManager.createSubmission({
            studentId,
            assignmentId,
            studentUniqueId,
        });

        await submissionQueue.add("grade_assignment", submission, {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        try {
            const io = getIO();
            io.to(`assignment:${assignmentId}`).emit("new-submission", {
                assignmentId,
                submission: {
                    id: submission.id,
                    studentId: submission.studentId,
                    status: submission.status,
                    submittedAt: submission.submittedAt,
                },
            });
        } catch (socketError) {
            console.warn("Could not emit socket event:", socketError);
        }

        return res.status(201).json({ success: true, data: submission });
    }

    private async getMySubmissions(req: Request, res: Response) {
        const studentId = req.user!.id;
        const submissions = await this._submissionManager.getSubmissionsByStudent(studentId);

        return res.status(200).json({ success: true, data: submissions });
    }

    private async getAssignmentSubmissions(req: Request, res: Response) {
        const assignmentId = req.params.assignmentId as string;
        const teacherId = req.user!.id;

        // Verify the teacher owns this assignment before showing submissions
        const assignment = await prisma.assignment.findFirst({
            where: { id: assignmentId, teacherId },
        });

        if (!assignment) {
            throw new AppError("Assignment not found or access denied", 404);
        }

        const submissions = await this._submissionManager.getSubmissionsByAssignment(assignmentId);
        return res.status(200).json({ success: true, data: submissions });
    }

    private async getUploadUrl(req: Request, res: Response) {
        const parsed = uploadUrlSchema.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const studentId = req.user!.id;
        const { fileName, type, assignmentId } = parsed.data;

        const { url, key } = await this._submissionManager.presignedUrl(
            fileName,
            type,
            assignmentId,
            studentId,
        );

        return res.status(200).json({ success: true, data: { url, key } });
    }

    private async getRecentSubmissions(req: Request, res: Response) {
        const userId = req.user!.id;
        const role = req.user!.role;

        const submissions = role === "TEACHER"
            ? await this._submissionManager.getRecentSubmissionsForTeacher(userId)
            : await this._submissionManager.getSubmissionsByStudent(userId);

        return res.status(200).json({ success: true, data: submissions });
    }

    public async verifyAssignmentOtp(req: Request, res: Response) {
        const parsed = verifyOtpSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const { otp, assignmentId } = parsed.data;
        const isVerified = await this._submissionManager.verifyAssignmentOtp(assignmentId, otp);

        if (!isVerified) {
            throw new AppError("Invalid OTP", 403);
        }

        return res.status(200).json({ success: true, data: { message: "verified" } });
    }

    public async allowResubmission(req: Request, res: Response) {
        const parsed = submissionActionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const teacherId = req.user!.id;
        const { submissionId } = parsed.data;

        // Verify the teacher owns the assignment this submission belongs to
        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                assignment: { teacherId },
            },
        });

        if (!submission) {
            throw new AppError("Submission not found or access denied", 404);
        }

        await this._submissionManager.deleteSubmission(submissionId);
        return res.status(200).json({ success: true, data: null });
    }

    public async allowRevaluate(req: Request, res: Response) {
        const parsed = submissionActionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const teacherId = req.user!.id;
        const { submissionId } = parsed.data;

        // Verify the teacher owns the assignment this submission belongs to
        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                assignment: { teacherId },
            },
        });

        if (!submission) {
            throw new AppError("Submission not found or access denied", 404);
        }

        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: "PENDING",
                score: null,
                feedback: Prisma.JsonNull,
            },
        });

        await submissionQueue.add("grade_assignment", updatedSubmission, {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        return res.status(200).json({ success: true, data: null });
    }
}