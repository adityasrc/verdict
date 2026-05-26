import { type Response } from "express";

export class AppError extends Error {
    statusCode: number;
    details?: unknown;

    constructor(message: string, statusCode: number, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        
        // Restore prototype chain for instanceof checks to work properly
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const handleError = (res: Response, err: unknown) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.statusCode,
            details: err.details || null,
        });
    }

    
    if (err instanceof Error) {
        console.error("[Unhandled System Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            code: 500,
            details: null,
        });
    }

    console.error("[Unknown Error Type]:", err);
    return res.status(500).json({
        success: false,
        message: "An unknown error occurred",
        code: 500,
        details: null,
    });
};