import { S3Client as AWSS3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const s3 = new AWSS3Client({
    region: "auto", // R2 requires 'auto'
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.ACCESSKEYID!,
        secretAccessKey: process.env.SECRETACCESSKEY!,
    },
    forcePathStyle: true,
});

const S3Client = {
    raw: s3,
    list: async () => {
        // Ping the specific bucket to test connection — don't list all buckets
        const command = new HeadBucketCommand({
            Bucket: process.env.BUCKET_NAME
        });
        return await s3.send(command);
    }
};

export default S3Client;