import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";

export const errorMiddleware = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let message = "Internal server error";
    let details: unknown = null;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details || null;
    } else {
        console.error("[Unhandled Error]:", err);
    }

    return res.status(statusCode).json({
        success: false,
        message,
        code: statusCode,
        details,
    });
};
