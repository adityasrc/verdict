import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { AuthController } from "../auth/auth.controller.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", authMiddleware, AuthController.getCurrentUser);
router.post("/refresh", AuthController.refreshToken);

export default router;
