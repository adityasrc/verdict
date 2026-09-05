import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import Client from "../../utils/S3client.js";

export class SubmissionManager {

    async createSubmission(data: {
        studentId: string;
        assignmentId: string;
        fileKey: string;
    }) {

        const exists = await prisma.submission.findUnique({
            where: {
                studentId_assignmentId: {
                    studentId: data.studentId,
                    assignmentId: data.assignmentId,
                },
            },
        });

        if (exists) {
            throw new AppError("You have already submitted this assignment.", 409);
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
        });
    }

    async presignedUrl(fileName: string, type: string, assignmentId: string, studentId: string) {

        const exists = await prisma.submission.findUnique({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId,
                },
            },
        });

        if (exists) {
            throw new AppError("You have already submitted this assignment.", 409);
        }

        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            throw new AppError("Storage configuration missing.", 500);
        }

        const key = `${assignmentId}/${studentId}.pdf`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: type,
        });

        const url = await getSignedUrl(Client.raw, command, {
            expiresIn: 600, // 10 mins
        });

        return { url, key };
    }

    async updateSubmissionGrade(
        submissionId: string,
        data: {
            score: number;
            feedback: Prisma.InputJsonValue;
            status: SubmissionStatus;
        },
    ) {
        return prisma.submission.update({
            where: { id: submissionId },
            data: {
                score: data.score,
                feedback: data.feedback ?? Prisma.JsonNull,
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