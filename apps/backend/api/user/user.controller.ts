import { Router, type Request, type Response } from "express";
import { catchAsync } from "../utils/catchAsyncWrapper.js";
import { UserManager } from "./user.manager.js";

export class UserController {
    public router = Router();
    private _userManager = new UserManager();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/health", catchAsync(this.health.bind(this)));
    }

    public async health(req: Request, res: Response) {
        return res.status(200).json({ success: true, data: "Ok" });
    }
}