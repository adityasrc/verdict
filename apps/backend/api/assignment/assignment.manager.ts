import { randomInt } from "crypto";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import type { CreateAssignmentInput } from "../../validators/zod.js";

export class AssignmentManager {
    async createAssignment(
        data: CreateAssignmentInput & { teacherId: string }
    ) {
        if (data.rubricId) {
            const rubric = await prisma.rubric.findFirst({
                where: { id: data.rubricId, teacherId: data.teacherId },
            });

            if (!rubric) {
                throw new AppError("Rubric not found", 404);
            }
        }

        // auto-generate 4-digit pin
        const accessPin = String(randomInt(1000, 9999));

        return prisma.assignment.create({
            data: { ...data, accessPin },
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
            select: {
                id: true,
                title: true,
                description: true,
                maxScore: true,
                dueDate: true,
                createdAt: true,
                updatedAt: true,
                teacherId: true,
                rubricId: true,
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

    async getAllStudentAssignments() {
        return prisma.assignment.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                description: true,
                maxScore: true,
                dueDate: true,
                createdAt: true,
                updatedAt: true,
                teacherId: true,
                rubricId: true,
                rubric: true,
            },
        });
    }

    async deleteAssignment(id: string, teacherId: string) {
        const assignment = await prisma.assignment.findFirst({
            where: { id, teacherId },
        });

        if (!assignment) {
            throw new AppError("Assignment not found or access denied", 404);
        }

        return prisma.assignment.delete({
            where: { id },
        });
    }
}
