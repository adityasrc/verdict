import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { RubricController } from "../rubric/rubric.controller.js";

const router = Router();

router.use(authMiddleware, requireRole("TEACHER"));

router.post("/", RubricController.createRubric);
router.get("/", RubricController.getRubrics);
router.get("/:id", RubricController.getRubric);
router.put("/:id", RubricController.updateRubric);
router.delete("/:id", RubricController.deleteRubric);

export default router;
