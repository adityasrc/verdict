import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsyncWrapper.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import { AuthManager } from "./auth.manager.js";
import { registerSchema, loginSchema } from "../../validators/zod.js";

export class AuthController {
    public router = Router();
    private _authManager = new AuthManager();

    constructor() {
        this.initializeRouter();
    }

    private initializeRouter() {
        this.router.post("/register", catchAsync(this.register.bind(this)));
        this.router.post("/login", catchAsync(this.login.bind(this)));
        this.router.get("/me", authMiddleware, catchAsync(this.getCurrentUser.bind(this)));
        this.router.post("/refresh", catchAsync(this.refreshToken.bind(this)));

        // FIX: Added logout route
        this.router.post("/logout", authMiddleware, catchAsync(this.logout.bind(this)));
    }

    public async register(req: Request, res: Response) {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const result = await this._authManager.register(parsed.data);
        return res.status(201).json({ success: true, data: result });
    }

    public async login(req: Request, res: Response) {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("Validation failed", 400, parsed.error.format());
        }

        const result = await this._authManager.login(parsed.data.email, parsed.data.password);
        return res.status(200).json({ success: true, data: result });
    }

    public async getCurrentUser(req: Request, res: Response) {
        const userId = req.user!.id;
        const result = await this._authManager.getCurrentUser(userId);
        return res.status(200).json({ success: true, data: result });
    }

    public async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError("Refresh token is required", 400);
        }

        const result = await this._authManager.refreshToken(refreshToken);
        return res.status(200).json({ success: true, data: result });
    }


    public async logout(req: Request, res: Response) {
        const userId = req.user!.id;

        await this._authManager.logout(userId);
        return res.status(200).json({ success: true, data: null });
    }
}