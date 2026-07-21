import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import type { RegisterInput } from "../../validators/zod.js";

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export class AuthManager {
    private JWT_SECRET: string;
    private JWT_REFRESH_SECRET: string;
    private JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
    private JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

    constructor() {
        // Fail loud on startup if secrets are missing - never use insecure fallbacks
        if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
            throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables");
        }
        this.JWT_SECRET = process.env.JWT_SECRET;
        this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    }

    async register(input: RegisterInput) {
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (existingUser) {
            throw new AppError("User with this email already exists", 409);
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        const user = await prisma.user.create({
            data: {
                email: input.email,
                password: hashedPassword,
                name: input.name,
                role: input.role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        const { accessToken, refreshToken } = this.generateTokens({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return { user, accessToken, refreshToken };
    }

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new AppError("Invalid email or password", 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new AppError("Invalid email or password", 401);
        }

        const { accessToken, refreshToken } = this.generateTokens({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }

    async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        return { user };
    }

    async refreshToken(refreshToken: string) {
        try {
            const decoded = jwt.verify(
                refreshToken,
                this.JWT_REFRESH_SECRET,
            ) as TokenPayload;

            return this.generateTokens({
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            });
        } catch (_error) {
            throw new AppError("Invalid or expired refresh token", 401);
        }
    }


    async logout(userId: string) {
        return true;
    }

    private generateTokens(payload: TokenPayload) {
        const accessToken = jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        return { accessToken, refreshToken };
    }

    verifyAccessToken(token: string): TokenPayload | null {
        try {
            return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
        } catch {
            return null;
        }
    }
}