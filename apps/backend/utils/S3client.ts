import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const { R2_ENDPOINT, ACCESSKEYID, SECRETACCESSKEY, BUCKET_NAME } = process.env;

if (!R2_ENDPOINT || !ACCESSKEYID || !SECRETACCESSKEY) {
    throw new Error("Missing R2/S3 storage credentials in environment variables.");
}

export const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: ACCESSKEYID,
        secretAccessKey: SECRETACCESSKEY,
    },
    forcePathStyle: true,
});

export const checkS3Health = () => s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));