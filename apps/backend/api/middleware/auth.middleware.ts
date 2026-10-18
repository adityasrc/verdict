import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import type { TokenPayload } from "../auth/auth.manager.js";
import { AppError } from "../../utils/AppError.js";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError("No token provided", 401));
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role as UserRole,
        };

        next();
    } catch {
        next(new AppError("Invalid or expired token", 401));
    }
};

export const requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return next(new AppError("Authentication required", 401));
        }

        if (!roles.includes(userRole)) {
            return next(new AppError("Insufficient permissions", 403));
        }

        next();
    };
};