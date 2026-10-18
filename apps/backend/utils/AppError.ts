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