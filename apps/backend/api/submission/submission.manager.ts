import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma } from "@prisma/client";
import { prisma } from "../../utils/db.js";
import { AppError } from "../../utils/apiResponseHandler.js";
import Client from "../../utils/S3client.js";

export class SubmissionManager {
    async createSubmission(data: { studentId: string; assignmentId: string; studentUniqueId?: string }) {
        const previousSubmission = await prisma.submission.findFirst({
            where: {
                assignmentId: data.assignmentId,
                studentId: data.studentId,
            },
        });

        if (previousSubmission) {
            throw new AppError("You can only make One Submission", 403);
        }

        if (!process.env.PUBLIC_ENDPOINT) {
            throw new AppError("Cannot generate public url, missing PUBLIC_ENDPOINT env variable", 500);
        }

        const assignmentPublicUrl = `${process.env.PUBLIC_ENDPOINT}/${data.assignmentId}/${data.studentId}`;
        const fileKey = `${data.assignmentId}/${data.studentId}`;
        
        return prisma.submission.create({
            data: {
                assignmentId: data.assignmentId,
                studentId: data.studentId,
                publicUrl: assignmentPublicUrl,
                studentUniqueId: data.studentUniqueId,
                fileKey: fileKey,
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
        const existingSubmission = await prisma.submission.findFirst({
            where: {
                assignmentId,
                studentId,
            },
        });

        if (existingSubmission) {
            throw new AppError("You can only make One Submission", 403);
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
            expiresIn: 60,
        });

        return { url, key };
    }

    async updateSubmissionGrade(
        submissionId: string,
        data: {
            score: number;
            feedback: any;
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