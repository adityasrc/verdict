import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/AppError.js";

export class RubricManager {
    static async createRubric(data: {
        name: string;
        criteria: { name: string; points: number; description: string }[];
        teacherId: string;
    }) {
        return prisma.rubric.create({
            data,
        });
    }

    static async getRubricsByTeacher(teacherId: string) {
        return prisma.rubric.findMany({
            where: { teacherId },
            orderBy: { createdAt: "desc" },
        });
    }

    static async getRubricById(id: string, teacherId: string) {
        return prisma.rubric.findFirst({
            where: { id, teacherId },
        });
    }

    static async updateRubric(
        id: string,
        teacherId: string,
        data: {
            name?: string;
            criteria?: { name: string; points: number; description: string }[];
        },
    ) {
        const result = await prisma.rubric.updateMany({
            where: { id, teacherId },
            data,
        });

        if (!result.count) {
            throw new AppError("Rubric not found", 404);
        }

        return prisma.rubric.findUniqueOrThrow({ where: { id } });
    }

    static async deleteRubric(id: string, teacherId: string) {
        const assigned = await prisma.assignment.findFirst({
            where: { rubricId: id, teacherId },
            select: { id: true },
        });
        if (assigned) {
            throw new AppError("This rubric is used by an assignment. Delete the assignment before deleting its rubric.", 409);
        }

        const result = await prisma.rubric.deleteMany({
            where: { id, teacherId },
        });

        if (!result.count) {
            throw new AppError("Rubric not found", 404);
        }
    }
}
