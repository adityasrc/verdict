import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma } from "@prisma/client";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import Client from "../../utils/S3client.js";

export class SubmissionManager {

    async createSubmission(data: { studentId: string; assignmentId: string; studentUniqueId?: string }) {
        let MAX_ATTEMPTS = 3;
        const fileKey = `${data.assignmentId}/${data.studentId}`;

        const existingSubmission = await prisma.submission.findFirst({
            where: {
                assignmentId: data.assignmentId,
                studentId: data.studentId,
            },
        });

        if (existingSubmission) {
            if (existingSubmission.attemptNumber >= MAX_ATTEMPTS) {
                throw new AppError(`You have reached the maximum of ${MAX_ATTEMPTS} attempts`, 403);
            }

            return prisma.submission.update({
                where: { id: existingSubmission.id },
                data: {
                    attemptNumber: existingSubmission.attemptNumber + 1,
                    status: "PENDING",
                }
            });
        }

        return prisma.submission.create({
            data: {
                assignmentId: data.assignmentId,
                studentId: data.studentId,
                studentUniqueId: data.studentUniqueId,
                fileKey: fileKey,
                attemptNumber: 1,
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

        let MAX_ATTEMPTS = 3;

        const existingSubmission = await prisma.submission.findFirst({
            where: {
                assignmentId,
                studentId,
            },
        });

        if (existingSubmission && existingSubmission.attemptNumber >= MAX_ATTEMPTS) {
            throw new AppError(`You have reached the maximum of ${MAX_ATTEMPTS} attempts`, 403);
        }

        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            throw new AppError("Storage configuration missing. Check BUCKET_NAME in .env", 500);
        }

        const key = `${assignmentId}/${studentId}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: type,
        });

        // Generates the URL using the centralized Client.raw which has forcePathStyle enabled
        const url = await getSignedUrl(Client.raw, command, {
            expiresIn: 600, // 10 minutes
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

    async verifyAssignmentOtp(assignmentId: string, otp: string) {
        return prisma.assignment.findFirst({
            where: {
                id: assignmentId,
                otp: otp,
            },
        });
    }

    async deleteSubmission(submissionId: string) {
        return prisma.submission.delete({
            where: { id: submissionId },
        });
    }
}