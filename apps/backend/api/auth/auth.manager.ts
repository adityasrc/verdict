import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/AppError.js";
import type { RegisterInput } from "../../validators/zod.js";

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export class AuthManager {
    private static get JWT_SECRET(): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET must be set in environment variables");
        }
        return secret;
    }

    private static get JWT_REFRESH_SECRET(): string {
        const secret = process.env.JWT_REFRESH_SECRET;
        if (!secret) {
            throw new Error("JWT_REFRESH_SECRET must be set in environment variables");
        }
        return secret;
    }

    private static get JWT_EXPIRES_IN(): string {
        return process.env.JWT_EXPIRES_IN || "7d";
    }

    private static get JWT_REFRESH_EXPIRES_IN(): string {
        return process.env.JWT_REFRESH_EXPIRES_IN || "7d";
    }

    static async register(input: RegisterInput) {
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

    static async login(email: string, password: string) {
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

        const { password: userPassword, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }

    static async getCurrentUser(userId: string) {
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

    static async refreshToken(refreshToken: string) {
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
        } catch {
            throw new AppError("Invalid or expired refresh token", 401);
        }
    }

    private static generateTokens(payload: TokenPayload) {
        const accessToken = jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        return { accessToken, refreshToken };
    }

    static verifyAccessToken(token: string): TokenPayload | null {
        try {
            return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
        } catch {
            return null;
        }
    }
}