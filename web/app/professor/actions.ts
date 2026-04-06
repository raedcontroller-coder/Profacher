'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getProfessorStats() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!session || (session.user as any).role !== "PROFESSOR") {
    throw new Error("Não autorizado")
  }

  const [totalGroups, totalQuestions] = await Promise.all([
    prisma.questionGroup.count({ where: { teacherId: Number(userId) } }),
    prisma.question.count({ where: { teacherId: Number(userId) } })
  ]);

  return {
    totalGroups,
    totalQuestions,
    lastActivity: new Date()
  };
}
