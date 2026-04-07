import { S3Client, CreateBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3"
import * as dotenv from 'dotenv'
import path from 'path'

// Carregar .env da pasta web
dotenv.config({ path: path.join(process.cwd(), '.env') })

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "",
    },
})

const BUCKET = process.env.MINIO_BUCKET || "profacher"

async function setup() {
    console.log(`--- CONFIGURANDO BUCKET: ${BUCKET} ---`)
    console.log(`Endpoint: ${process.env.MINIO_ENDPOINT}`)
    
    try {
        // 1. Tentar criar o bucket
        try {
            await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }))
            console.log(`✅ Bucket '${BUCKET}' criado com sucesso!`)
        } catch (e: any) {
            if (e.name === "BucketAlreadyOwnedByYou" || e.name === "BucketAlreadyExists") {
                console.log(`ℹ️ Bucket '${BUCKET}' já existe.`)
            } else {
                throw e
            }
        }

        // 2. Definir Política Pública (ReadOnly para todos)
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] },
                    Action: ["s3:GetBucketLocation", "s3:ListBucket"],
                    Resource: [`arn:aws:s3:::${BUCKET}`]
                },
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] },
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${BUCKET}/*`]
                }
            ]
        }

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: BUCKET,
            Policy: JSON.stringify(policy)
        }))
        
        console.log(`✅ Política de acesso PÚBLICA aplicada ao bucket '${BUCKET}'!`)
        console.log(`\n🚀 TUDO PRONTO! Agora pode tentar o upload na plataforma.`)

    } catch (err: any) {
        console.error("\n❌ ERRO NA CONFIGURAÇÃO:")
        console.error(err.message)
    }
}

setup()
