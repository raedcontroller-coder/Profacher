'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function saveExam(data: {
  title: string;
  description?: string;
  questions: Array<{
    content: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
    points: number;
    referenceAnswer?: string;
    options?: Array<{ content: string; isCorrect: boolean }>;
  }>;
}) {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!session || (session.user as any).role !== "PROFESSOR") {
    throw new Error("Não autorizado")
  }

  try {
    // 1. Criar o Exame
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        teacherId: Number(userId),
      }
    });

    // 2. Lógica de auto-organização: Criar um grupo para esta prova se houver questões novas
    let group = await prisma.questionGroup.findFirst({
      where: { 
        name: data.title,
        teacherId: Number(userId)
      }
    });

    if (!group && data.questions.length > 0) {
      group = await prisma.questionGroup.create({
        data: {
          name: data.title,
          description: `Questões criadas automaticamente a partir da prova: ${data.title}`,
          teacherId: Number(userId)
        }
      });
    }

    // 3. Processar as questões
    for (let i = 0; i < data.questions.length; i++) {
        const qData = data.questions[i];
        
        // Criar a questão no banco de questões vinculada ao grupo recém-criado/encontrado
        const question = await prisma.question.create({
            data: {
                content: qData.content,
                type: qData.type,
                points: qData.points,
                referenceAnswer: qData.referenceAnswer,
                teacherId: Number(userId),
                groupId: group?.id,
                options: {
                    create: qData.options?.map(opt => ({
                        content: opt.content,
                        isCorrect: opt.isCorrect
                    }))
                }
            }
        });

        // Vincular a questão ao exame
        await prisma.examQuestion.create({
            data: {
                examId: exam.id,
                questionId: question.id,
                order: i
            }
        });
    }

    revalidatePath("/professor/exams")
    revalidatePath("/professor/questions")
    
    return { success: true, examId: exam.id };
  } catch (e: any) {
    console.error("Erro ao salvar prova:", e);
    return { success: false, error: e.message };
  }
}

export async function getTeacherQuestions() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!session || (session.user as any).role !== "PROFESSOR") {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const groups = await prisma.questionGroup.findMany({
      where: { teacherId: Number(userId) },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return { success: true, groups };
  } catch (e: any) {
    console.error("Erro ao buscar questões:", e);
    return { success: false, error: e.message };
  }
}
