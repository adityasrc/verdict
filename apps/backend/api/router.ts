import { Router } from "express";
import { AssignmentController } from "./assignment/assignment.controller.js";
import { AuthController } from "./auth/auth.controller.js";
import { RubricController } from "./rubric/rubric.controller.js";
import { SubmissionController } from "./submission/submission.controller.js";
import { UserController } from "./user/user.controller.js";

const router = Router();


const authController = new AuthController();
const userCtrl = new UserController();
const assignmentCtrl = new AssignmentController();
const submissionCtrl = new SubmissionController();
const rubricCtrl = new RubricController();


router.use("/auth", authController.router);
router.use("/users", userCtrl.router);
router.use("/assignments", assignmentCtrl.router);
router.use("/submissions", submissionCtrl.router);
router.use("/rubrics", rubricCtrl.router);


router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;