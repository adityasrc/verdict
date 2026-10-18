import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { AuthManager } from "./auth.manager.js";
import { registerSchema, loginSchema } from "../../validators/zod.js";

export class AuthController {
    static async register(req: Request, res: Response) {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const result = await AuthManager.register(parsed.data);
        return res.status(201).json({ success: true, data: result });
    }

    static async login(req: Request, res: Response) {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || "Validation failed";
            throw new AppError(message, 400);
        }

        const result = await AuthManager.login(parsed.data.email, parsed.data.password);
        return res.status(200).json({ success: true, data: result });
    }

    static async getCurrentUser(req: Request, res: Response) {
        const userId = req.user!.id;
        const result = await AuthManager.getCurrentUser(userId);
        return res.status(200).json({ success: true, data: result });
    }

    static async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError("Refresh token is required", 400);
        }

        const result = await AuthManager.refreshToken(refreshToken);
        return res.status(200).json({ success: true, data: result });
    }
}