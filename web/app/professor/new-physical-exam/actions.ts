'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function savePhysicalExam(data: {
  title: string;
  description?: string;
  aiInstructions?: string;
  totalScore: number;
  answerKeyImages: string[];
}) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado ou sessão inválida")
  }

  try {
    // Gerar Código Único
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let accessCode = '';
    let isUnique = false;
    
    while (!isUnique) {
      accessCode = Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      const existing = await prisma.exam.findUnique({ where: { accessCode: accessCode } });
      if (!existing) isUnique = true;
    }

    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        type: 'PHYSICAL',
        aiInstructions: data.aiInstructions,
        totalScore: data.totalScore,
        answerKeyImages: data.answerKeyImages,
        teacherId: userId,
        accessCode: accessCode,
        status: 'WAITING',
      }
    });

    revalidatePath("/professor/exams")
    
    return { success: true, examId: exam.id };
  } catch (e: any) {
    console.error("Erro ao salvar prova física:", e);
    return { success: false, error: e.message };
  }
}
