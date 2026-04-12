'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function saveExam(data: {
  title: string;
  description?: string;
  showScore?: boolean;
  questions: Array<{
    content: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
    points: number;
    referenceAnswer?: string;
    options?: Array<{ content: string; isCorrect: boolean }>;
  }>;
}) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado ou sessão inválida")
  }

  try {
    // 1. Gerar Código Único de 5 caracteres
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let accessCode = '';
    let isUnique = false;
    
    while (!isUnique) {
      accessCode = Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      const existing = await prisma.exam.findUnique({ where: { accessCode: accessCode } });
      if (!existing) isUnique = true;
    }

    // 2. Pré-gerenciar Grupo (Fora da transação paralela para evitar race conditions de criação de grupo)
    let group = await prisma.questionGroup.findFirst({
      where: { name: data.title, teacherId: Number(userId) }
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

    // 3. Processar questões em PARALELO
    const questionPromises = data.questions.map(async (qData) => {
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
      return question.id;
    });

    const questionIds = await Promise.all(questionPromises);

    // 4. Transação Atômica Relâmpago para o Exame e Vínculos
    const examId = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          description: data.description,
          showScore: data.showScore ?? false,
          teacherId: Number(userId),
          accessCode: accessCode,
          status: 'WAITING',
        }
      });

      if (questionIds.length > 0) {
        await tx.examQuestion.createMany({
          data: questionIds.map((id, index) => ({
            examId: exam.id,
            questionId: id,
            order: index
          }))
        });
      }

      return exam.id;
    }, { timeout: 30000 });

    revalidatePath("/professor/exams")
    revalidatePath("/professor/questions")
    
    return { success: true, examId };
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

export async function updateExam(examId: number, data: {
  title: string;
  description?: string;
  showScore?: boolean;
  questions: Array<{
    id?: number;
    content: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
    points: number;
    referenceAnswer?: string;
    options?: Array<{ content: string; isCorrect: boolean }>;
  }>;
}) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado ou sessão inválida")
  }

  try {
    // 1. Validar propriedade e status
    const existingExam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { teacherId: true, status: true }
    });

    if (!existingExam || existingExam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada ou acesso negado" };
    }

    if (existingExam.status === 'STARTED') {
      return { success: false, error: "Não é possível editar uma prova em andamento." };
    }

    // 2. Processar questões em PARALELO (Otimização Extrema)
    // Isso tira o peso do banco de dentro da transação sequencial
    const questionPromises = data.questions.map(async (qData) => {
      let questionId = qData.id;

      if (questionId) {
        // Atualizar questão existente
        await prisma.question.update({
          where: { id: questionId },
          data: {
            content: qData.content,
            type: qData.type,
            points: qData.points,
            referenceAnswer: qData.referenceAnswer,
            options: {
              deleteMany: {},
              create: qData.options?.map(opt => ({
                content: opt.content,
                isCorrect: opt.isCorrect
              }))
            }
          }
        });
        return questionId;
      } else {
        // Criar nova questão
        const newQ = await prisma.question.create({
          data: {
            content: qData.content,
            type: qData.type,
            points: qData.points,
            referenceAnswer: qData.referenceAnswer,
            teacherId: userId,
            options: {
              create: qData.options?.map(opt => ({
                content: opt.content,
                isCorrect: opt.isCorrect
              }))
            }
          }
        });
        return newQ.id;
      }
    });

    // Aguarda todas as questões serem salvas em paralelo
    const questionIdList = await Promise.all(questionPromises);

    // 3. Transação Atômica Relâmpago (Apenas para vínculos)
    // Como as questões já estão no banco, isso aqui dura milissegundos
    await prisma.$transaction(async (tx) => {
      // Update do Exame
      await tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          description: data.description,
          showScore: data.showScore ?? false,
        }
      });

      // Recriar vínculos
      await tx.examQuestion.deleteMany({ where: { examId: examId } });

      if (questionIdList.length > 0) {
        await tx.examQuestion.createMany({
          data: questionIdList.map((qId, index) => ({
            examId: examId,
            questionId: qId,
            order: index
          }))
        });
      }
    }, { timeout: 30000 });

    revalidatePath("/professor/exams")
    return { success: true };
  } catch (e: any) {
    console.error("Erro ao atualizar prova:", e);
    return { success: false, error: e.message };
  }
}
