import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma, type SubmissionStatus } from "@prisma/client";
import { prisma } from "../../utils/db.js";
import { submissionQueue } from "../../utils/queue.js";
import { getIO } from "../../ws/socket.js";
import { AppError } from "../../utils/AppError.js";
import { s3 } from "../../utils/S3client.js";

export class SubmissionManager {
    // check if the provided pin matches the assignment pin
    private static verifyPin(expectedPin: string | null, providedPin?: string | null) {
        if (!expectedPin) return;
        if (!providedPin || providedPin !== expectedPin) {
            throw new AppError("Invalid PIN.", 403);
        }
    }

    static async createSubmission(data: {
        studentId: string;
        assignmentId: string;
        fileKey: string;
        pin?: string;
    }) {
        const { studentId, assignmentId, fileKey, pin } = data;

        const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment) {
            throw new AppError("Assignment not found", 404);
        }

        SubmissionManager.verifyPin(assignment.accessPin, pin);

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

        const submission = await prisma.submission.create({
            data: {
                assignmentId,
                studentId,
                fileKey,
            },
        });

        const publicUrl = `${process.env.PUBLIC_ENDPOINT}/${submission.fileKey}`;
        await submissionQueue.add("grade_assignment", {
            id: submission.id,
            assignmentId: submission.assignmentId,
            fileKey: submission.fileKey,
            studentId: submission.studentId,
            publicUrl,
        });

        try {
            const io = getIO();
            io.to(`assignment:${assignmentId}`).emit("new-submission", {
                assignmentId,
                submission: {
                    id: submission.id,
                    studentId: submission.studentId,
                    status: submission.status,
                    submittedAt: submission.submittedAt,
                },
            });
        } catch (socketError) {
            console.warn("Could not emit socket event:", socketError);
        }

        return submission;
    }

    static async getSubmissionsByStudent(studentId: string) {
        return prisma.submission.findMany({
            where: { studentId },
            include: {
                assignment: {
                    select: {
                        title: true,
                        maxScore: true,
                        description: true,
                        dueDate: true,
                    },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    static async getAssignmentSubmissions(assignmentId: string, teacherId: string) {
        const assignment = await prisma.assignment.findFirst({
            where: { id: assignmentId, teacherId },
        });

        if (!assignment) {
            throw new AppError("Assignment not found or access denied", 404);
        }

        return prisma.submission.findMany({
            where: { assignmentId },
            include: {
                student: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    static async getRecentSubmissionsForTeacher(teacherId: string) {
        return prisma.submission.findMany({
            where: {
                assignment: {
                    teacherId,
                },
            },
            include: {
                assignment: {
                    select: {
                        title: true,
                        maxScore: true,
                    },
                },
                student: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { submittedAt: "desc" },
        });
    }

    static async presignedUrl(data: {
        fileName: string;
        type: string;
        assignmentId: string;
        studentId: string;
        pin?: string;
    }) {
        const { type, assignmentId, studentId, pin } = data;

        const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
        if (!assignment) {
            throw new AppError("Assignment not found", 404);
        }

        SubmissionManager.verifyPin(assignment.accessPin, pin);

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

        const url = await getSignedUrl(s3, command, {
            expiresIn: 600, // 10 mins
        });

        return { url, key };
    }

    static async updateSubmissionGrade(
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

    static async deleteSubmission(submissionId: string, teacherId: string) {
        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                assignment: { teacherId },
            },
        });

        if (!submission) {
            throw new AppError("Submission not found or access denied", 404);
        }

        return prisma.submission.delete({
            where: { id: submissionId },
        });
    }

    static async allowRevaluate(submissionId: string, teacherId: string) {
        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                assignment: { teacherId },
            },
        });

        if (!submission) {
            throw new AppError("Submission not found or access denied", 404);
        }

        const updatedSubmission = await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: "PENDING",
                score: null,
                feedback: Prisma.JsonNull,
            },
        });

        const publicUrl = `${process.env.PUBLIC_ENDPOINT}/${updatedSubmission.fileKey}`;
        await submissionQueue.add("grade_assignment", {
            id: updatedSubmission.id,
            assignmentId: updatedSubmission.assignmentId,
            fileKey: updatedSubmission.fileKey,
            studentId: updatedSubmission.studentId,
            publicUrl,
        });

        try {
            const io = getIO();
            io.to(`assignment:${updatedSubmission.assignmentId}`).emit("submission-progress", {
                submissionId: updatedSubmission.id,
                status: "PENDING",
            });
        } catch (socketError) {
            console.warn("Could not emit socket event:", socketError);
        }

        return updatedSubmission;
    }
}