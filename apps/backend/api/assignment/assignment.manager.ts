import { prisma } from "../../utils/db.js";
import type { CreateAssignmentInput } from "../../validators/zod.js";

export class AssignmentManager {
    async createAssignment(
        data: CreateAssignmentInput & { teacherId: string; otp: string }
    ) {
        return prisma.assignment.create({
            data: {
                ...data,
                status: "PUBLISHED",
            },
        });
    }

    async getAssignmentsByTeacher(teacherId: string) {
        return prisma.assignment.findMany({
            where: { teacherId },
            include: {
                _count: {
                    select: { submissions: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async getAssignmentById(id: string) {
        return prisma.assignment.findUnique({
            where: { id },
            omit: {
                // Never send the OTP to the client; it's only used server-side during verification
                otp: true,
            },
            include: {
                teacher: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                rubric: true,
            },
        });
    }

    async getAllAssignments() {
        return prisma.assignment.findMany({
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
            include: {
                rubric: true,
            },
        });
    }
}