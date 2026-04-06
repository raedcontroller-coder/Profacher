import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
dotenv.config({ path: './web/.env' });

async function testConnection() {
    console.log("--- TESTANDO CONEXÃO MINIO ---");
    console.log("Endpoint:", process.env.MINIO_ENDPOINT);
    console.log("Bucket:", process.env.MINIO_BUCKET);
    console.log("Access Key:", process.env.MINIO_ACCESS_KEY);

    const client = new S3Client({
        region: "us-east-1",
        endpoint: process.env.MINIO_ENDPOINT,
        forcePathStyle: true,
        credentials: {
            accessKeyId: process.env.MINIO_ACCESS_KEY || "",
            secretAccessKey: process.env.MINIO_SECRET_KEY || "",
        },
    });

    try {
        const response = await client.send(new ListBucketsCommand({}));
        console.log("\n✅ SUCESSO! Conexão estabelecida.");
        console.log("Buckets encontrados:", response.Buckets?.map(b => b.Name));
        
        const bucketExists = response.Buckets?.some(b => b.Name === process.env.MINIO_BUCKET);
        if (bucketExists) {
            console.log(`\n🎉 O bucket '${process.env.MINIO_BUCKET}' foi encontrado e está pronto!`);
        } else {
            console.log(`\n⚠️ ATENÇÃO: O bucket '${process.env.MINIO_BUCKET}' NÃO existe lá dentro.`);
            console.log("Por favor, crie-o no console do MinIO (porta 9001).");
        }
    } catch (err: any) {
        console.log("\n❌ ERRO DE CONEXÃO:");
        console.log(err.message);
        if (err.message.includes("ENOTFOUND")) console.log("Dica: Domínio/IP não encontrado.");
        if (err.message.includes("ECONNREFUSED")) console.log("Dica: Porta 9000 fechada ou firewall bloqueando.");
    }
}

testConnection();
