import { S3Client as AWSS3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const { R2_ENDPOINT, ACCESSKEYID, SECRETACCESSKEY } = process.env;

if (!R2_ENDPOINT || !ACCESSKEYID || !SECRETACCESSKEY) {
    throw new Error("Missing R2/S3 storage credentials in environment variables.");
}


const s3 = new AWSS3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: ACCESSKEYID,
        secretAccessKey: SECRETACCESSKEY,
    },
    forcePathStyle: true,
});

const S3Client = {
    raw: s3,
    checkHealth: async () => {
        const command = new HeadBucketCommand({
            Bucket: process.env.BUCKET_NAME
        });
        return await s3.send(command);
    }
};


export default S3Client;