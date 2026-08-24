import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma } from "@prisma/client";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import Client from "../../utils/S3client.js";

export class SubmissionManager {

    async createSubmission(data: {
        studentId: string;
        assignmentId: string;
        fileKey: string;
    }) {
        // One submission per student per assignment. If one already exists,
        // it must be deleted first via allowResubmission before a new one can be created.
        const existing = await prisma.submission.findUnique({
            where: {
                studentId_assignmentId: {
                    studentId: data.studentId,
                    assignmentId: data.assignmentId,
                },
            },
        });

        if (existing) {
            throw new AppError("You have already submitted this assignment. Ask your teacher to allow resubmission.", 409);
        }

        return prisma.submission.create({
            data: {
                assignmentId: data.assignmentId,
                studentId: data.studentId,
                fileKey: data.fileKey,
            },
        });
    }

    async getSubmissionsByStudent(studentId: string) {
        return prisma.submission.findMany({
            where: { studentId },
            include: {
                assignment: {
                    select: {
                        title: true,
                        dueDate: true,
                        maxScore: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    async getSubmissionsByAssignment(assignmentId: string) {
        return prisma.submission.findMany({
            where: { assignmentId },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    async getRecentSubmissionsForTeacher(teacherId: string) {
        return prisma.submission.findMany({
            where: {
                assignment: {
                    teacherId: teacherId,
                },
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                assignment: {
                    select: {
                        title: true,
                        maxScore: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
            take: 10,
        });
    }

    async presignedUrl(fileName: string, type: string, assignmentId: string, studentId: string) {
        // Block upload if a submission already exists (student must ask teacher to allow resubmission first).
        const existing = await prisma.submission.findUnique({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId,
                },
            },
        });

        if (existing) {
            throw new AppError("You have already submitted this assignment. Ask your teacher to allow resubmission.", 409);
        }

        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            throw new AppError("Storage configuration missing. Check BUCKET_NAME in .env", 500);
        }

        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `${assignmentId}/${studentId}/${Date.now()}_${safeFileName}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: type,
        });

        const url = await getSignedUrl(Client.raw, command, {
            expiresIn: 600,
        });

        return { url, key };
    }

    async updateSubmissionGrade(
        submissionId: string,
        data: {
            score: number;
            feedback: string;
            status: "GRADED" | "REVIEWING" | "PENDING";
        },
    ) {
        return prisma.submission.update({
            where: { id: submissionId },
            data: {
                score: data.score,
                feedback: data.feedback ? data.feedback : Prisma.JsonNull,
                status: data.status,
                gradedAt: new Date(),
            },
        });
    }

    async deleteSubmission(submissionId: string) {
        return prisma.submission.delete({
            where: { id: submissionId },
        });
    }
}