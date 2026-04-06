import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3-client"

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`
        
        // Configurar o comando S3 para Upload
        const uploadCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
            ACL: "public-read", // Requer que o bucket aceite ACL pública
        })

        // Executar o Upload
        await s3Client.send(uploadCommand)

        // Gerar a URL pública do MinIO
        // A URL final depende de como o FQDN está configurado no Coolify
        // Por padrão no MinIO: endpoint/bucket/file
        const endpoint = process.env.MINIO_ENDPOINT || "http://127.0.0.1:9000"
        const publicUrl = `${endpoint}/${BUCKET_NAME}/${fileName}`

        return NextResponse.json({ 
            success: true, 
            url: publicUrl 
        })

    } catch (error: any) {
        console.error("Erro no upload MinIO:", error)
        return NextResponse.json({ 
            error: "Falha ao enviar arquivo para o servidor de armazenamento.",
            details: error.message 
        }, { status: 500 })
    }
}
