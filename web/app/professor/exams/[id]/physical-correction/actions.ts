'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { gradePhysicalExam } from "@/app/actions/aiAction"

export async function getPhysicalExamData(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" }
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        submissions: true
      }
    })

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada" }
    }

    if (exam.type !== 'PHYSICAL') {
      return { success: false, error: "Esta não é uma prova física" }
    }

    return { success: true, exam }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function processPhysicalCorrection(examId: number, studentImages: string[]) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" }
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    })

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada" }
    }

    const aiRes = await gradePhysicalExam(
      userId,
      exam.answerKeyImages as string[],
      studentImages,
      exam.totalScore || 10,
      exam.aiInstructions || ""
    )

    if (!aiRes.success) {
      return { success: false, error: aiRes.error }
    }

    const correctionData = aiRes.result

    const submission = await prisma.examSubmission.create({
      data: {
        examId: exam.id,
        studentName: correctionData.studentName,
        studentRa: correctionData.studentRa || `UNKNOWN_${Date.now()}`,
        isPhysical: true,
        studentExamImages: studentImages,
        score: correctionData.score,
        correctionDetails: correctionData.details,
        finishedAt: new Date()
      }
    })

    return { success: true, submissionId: submission.id, result: correctionData }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
