import { S3Client as AWSS3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const s3 = new AWSS3Client({
    region: "us-east-1",
    endpoint: process.env.R2_ENDPOINT, 
    credentials: {
        accessKeyId: process.env.ACCESSKEYID!,
        secretAccessKey: process.env.SECRETACCESSKEY!,
    },
    // CRITICAL: Ye MinIO ko local par chalne deta hai bina SSL/DNS errors ke
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