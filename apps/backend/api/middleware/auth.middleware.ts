import type { NextFunction, Request, Response } from "express";
import { AuthManager } from "../auth/auth.manager.js";
import { AppError } from "../../utils/apiResponseHandler.js";

const authManagerInstance = new AuthManager();


declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError("No token provided", 401));
        }

        const token = authHeader.substring(7);
        const decoded = authManagerInstance.verifyAccessToken(token);

        if (!decoded) {
            return next(new AppError("Invalid or expired token", 401));
        }

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch {
        next(new AppError("Authentication failed", 401));
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole || !roles.includes(userRole)) {
            return next(new AppError("Insufficient permissions", 403));
        }

        next();
    };
};