'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getPhysicalExamData(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado")
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId, teacherId: userId }
  })

  if (!exam) throw new Error("Prova não encontrada ou sem acesso.")
  if (exam.type !== 'PHYSICAL') throw new Error("Esta prova não é física.")
  
  return {
    title: exam.title,
    description: exam.description || "",
    aiInstructions: exam.aiInstructions || "",
    totalScore: exam.totalScore || 10,
    answerKeyImages: (exam.answerKeyImages as string[]) || [],
  }
}

export async function updatePhysicalExam(
  examId: number,
  data: {
    title: string;
    description?: string;
    aiInstructions?: string;
    totalScore: number;
    answerKeyImages: string[];
  }
) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado ou sessão inválida")
  }

  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId, teacherId: userId }})
    if (!exam) throw new Error("Prova não encontrada")
    if (exam.status === 'STARTED' || exam.status === 'FINISHED') {
      throw new Error("Não é possível editar uma prova em andamento ou finalizada.")
    }

    await prisma.exam.update({
      where: { id: examId },
      data: {
        title: data.title,
        description: data.description,
        aiInstructions: data.aiInstructions,
        totalScore: data.totalScore,
        answerKeyImages: data.answerKeyImages,
      }
    });

    revalidatePath("/professor/exams")
    revalidatePath(`/professor/exams/${examId}/edit-physical`)
    
    return { success: true };
  } catch (e: any) {
    console.error("Erro ao atualizar prova física:", e);
    return { success: false, error: e.message };
  }
}
