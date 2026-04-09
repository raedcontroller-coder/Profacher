'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getQuestionGroups() {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || !userId) throw new Error("Não autorizado")

  return await prisma.questionGroup.findMany({
    where: { teacherId: userId },
    include: { _count: { select: { questions: true } } },
    orderBy: { updatedAt: 'desc' }
  })
}

export async function createQuestionGroup(data: { name: string; description?: string }) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || !userId) throw new Error("Não autorizado")

  try {
    const group = await prisma.questionGroup.create({
      data: {
        name: data.name,
        description: data.description,
        teacherId: userId
      }
    })

    revalidatePath("/professor/questions")
    return { success: true, group }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteQuestionGroup(id: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null
  
  if (!session || !userId) throw new Error("Não autorizado")

  try {
    // Verificar se o grupo pertence ao professor
    const group = await prisma.questionGroup.findUnique({
        where: { id },
        select: { teacherId: true }
    });

    if (!group || group.teacherId !== userId) {
        return { success: false, error: "Acesso negado" };
    }

    await prisma.questionGroup.delete({ where: { id } })
    revalidatePath("/professor/questions")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getGroupWithQuestions(id: number) {
  const session = await auth()
  if (!session) throw new Error("Não autorizado")

  return await prisma.questionGroup.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          options: true
        },
        orderBy: { updatedAt: 'desc' }
      }
    }
  })
}

export async function createQuestionInBank(data: {
  groupId: number;
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
  points: number;
  referenceAnswer?: string;
  options?: Array<{ content: string; isCorrect: boolean }>;
}) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || !userId) throw new Error("Não autorizado")

  try {
    const question = await prisma.question.create({
      data: {
        content: data.content,
        type: data.type,
        points: data.points,
        referenceAnswer: data.referenceAnswer,
        teacherId: userId,
        groupId: data.groupId,
        options: {
          create: data.options?.map(opt => ({
            content: opt.content,
            isCorrect: opt.isCorrect
          }))
        }
      }
    })

    revalidatePath("/professor/questions")
    return { success: true, question }
  } catch (e: any) {
    console.error("Erro ao criar questão no banco:", e);
    return { success: false, error: e.message }
  }
}

export async function updateQuestionInBank(id: number, data: {
    content: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
    points: number;
    referenceAnswer?: string;
    options?: Array<{ content: string; isCorrect: boolean }>;
}) {
    const session = await auth()
    const userId = session?.user ? Number((session.user as any).id) : null

    if (!session || !userId) throw new Error("Não autorizado")

    try {
        // 1. Validar propriedade
        const existing = await prisma.question.findUnique({
            where: { id },
            select: { teacherId: true }
        })

        if (!existing || existing.teacherId !== userId) {
            return { success: false, error: "Acesso negado ou questão não encontrada" }
        }

        // 2. Atualizar em transação para garantir integridade das opções
        const question = await prisma.$transaction(async (tx) => {
            // Deletar opções anteriores
            await tx.questionOption.deleteMany({
                where: { questionId: id }
            })

            // Atualizar os dados da questão e criar novas opções
            return await tx.question.update({
                where: { id },
                data: {
                    content: data.content,
                    type: data.type,
                    points: data.points,
                    referenceAnswer: data.referenceAnswer,
                    options: {
                        create: data.options?.map(opt => ({
                            content: opt.content,
                            isCorrect: opt.isCorrect
                        }))
                    }
                }
            })
        })

        revalidatePath("/professor/questions")
        return { success: true, question }
    } catch (e: any) {
        console.error("Erro ao atualizar questão no banco:", e);
        return { success: false, error: e.message }
    }
}

export async function deleteQuestionInBank(id: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || !userId) throw new Error("Não autorizado")

  try {
    const existing = await prisma.question.findUnique({
        where: { id },
        select: { teacherId: true }
    })

    if (!existing || existing.teacherId !== userId) {
        return { success: false, error: "Acesso negado" }
    }

    await prisma.question.delete({ where: { id } })
    revalidatePath("/professor/questions")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
