import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { SubmissionController } from "../submission/submission.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/", requireRole("STUDENT"), SubmissionController.createSubmission);
router.post("/uploadUrl", requireRole("STUDENT"), SubmissionController.getUploadUrl);
router.get("/my-submissions", requireRole("STUDENT"), SubmissionController.getMySubmissions);

router.get("/assignment/:assignmentId", requireRole("TEACHER"), SubmissionController.getAssignmentSubmissions);
router.post("/reEvaluate", requireRole("TEACHER"), SubmissionController.allowRevaluate);
router.post("/deleteSubmission", requireRole("TEACHER"), SubmissionController.deleteSubmission);

router.get("/recent", SubmissionController.getRecentSubmissions);

export default router;
