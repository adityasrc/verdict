import { Router } from "express";
import { AssignmentController } from "./assignment/assignment.controller.js";
import { AuthController } from "./auth/auth.controller.js";
import { RubricController } from "./rubric/rubric.controller.js";
import { SubmissionController } from "./submission/submission.controller.js";

const router = Router();

const authController = new AuthController();
const assignmentCtrl = new AssignmentController();
const submissionCtrl = new SubmissionController();
const rubricCtrl = new RubricController();

router.use("/auth", authController.router);
router.use("/assignments", assignmentCtrl.router);
router.use("/submissions", submissionCtrl.router);
router.use("/rubrics", rubricCtrl.router);


export default router;