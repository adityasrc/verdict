import type { NextFunction, Request, Response } from "express";
import { AuthManager } from "../auth/auth.manager.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import type Role from "../types/roles.js";

const authManagerInstance = new AuthManager();

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
            role: decoded.role as Role,
        };

        next();
    } catch {
        next(new AppError("Authentication failed", 401));
    }
};

export const requireRole = (...roles: ("STUDENT" | "TEACHER")[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return next(new AppError("Authentication required", 401));
        }

        if (!roles.includes(userRole as "STUDENT" | "TEACHER")) {
            return next(new AppError("Insufficient permissions", 403));
        }

        next();
    };
};