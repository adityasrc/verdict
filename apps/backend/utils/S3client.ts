import { S3Client as AWSS3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3 = new AWSS3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.ACCESSKEYID || "minioadmin",
        secretAccessKey: process.env.SECRETACCESSKEY || "minioadmin",
    },
    // Required for MinIO local development to prevent subdomain routing
    forcePathStyle: true,
});

const S3Client = {
    raw: s3,
    list: async () => {
        const command = new ListBucketsCommand({});
        return await s3.send(command);
    }
};

export default S3Client;