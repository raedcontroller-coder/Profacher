import { S3Client } from "@aws-sdk/client-s3"

const minioEndpoint = process.env.MINIO_ENDPOINT || "http://127.0.0.1:9000"
const accessKey = process.env.MINIO_ACCESS_KEY || ""
const secretKey = process.env.MINIO_SECRET_KEY || ""

export const s3Client = new S3Client({
    region: "us-east-1", // MinIO ignora a região, mas o SDK exige
    endpoint: minioEndpoint,
    forcePathStyle: true, // Necessário para MinIO e hosts S3 customizados
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
    },
})

export const BUCKET_NAME = process.env.MINIO_BUCKET || "profacher"
