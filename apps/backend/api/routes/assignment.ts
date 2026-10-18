import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { AssignmentController } from "../assignment/assignment.controller.js";

const router = Router();

router.post(
    "/",
    authMiddleware,
    requireRole("TEACHER"),
    AssignmentController.createAssignment
);

router.get(
    "/teacher/my-assignments",
    authMiddleware,
    requireRole("TEACHER"),
    AssignmentController.getTeacherAssignments
);

router.get(
    "/student/all",
    authMiddleware,
    requireRole("STUDENT"),
    AssignmentController.getStudentAssignments
);

router.get("/:id", authMiddleware, AssignmentController.getAssignment);

router.delete(
    "/:id",
    authMiddleware,
    requireRole("TEACHER"),
    AssignmentController.deleteAssignment
);

export default router;
