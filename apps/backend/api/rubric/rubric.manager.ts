import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";

export class RubricManager {
    async createRubric(data: {
        name: string;
        criteria: { name: string; points: number; description: string }[];
        teacherId: string;
    }) {
        return prisma.rubric.create({
            data,
        });
    }

    async getRubricsByTeacher(teacherId: string) {
        return prisma.rubric.findMany({
            where: { teacherId },
            orderBy: { createdAt: "desc" },
        });
    }

    async getRubricById(id: string, teacherId: string) {
        return prisma.rubric.findFirst({
            where: { id, teacherId },
        });
    }

    async updateRubric(
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

    async deleteRubric(id: string, teacherId: string) {
        const result = await prisma.rubric.deleteMany({
            where: { id, teacherId },
        });

        if (!result.count) {
            throw new AppError("Rubric not found", 404);
        }
    }
}
