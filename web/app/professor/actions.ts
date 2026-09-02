'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/**
 * Retorna os créditos do professor logado, se ele for um professor independente
 * (Account do tipo INDIVIDUAL). Retorna null para professor de instituição, que não
 * usa o sistema de créditos (a instituição paga por conta própria).
 */
export async function getMyCreditsInfoAction() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      accountId: true,
      account: {
        select: {
          subscription: {
            select: { creditsRemaining: true, planRef: { select: { name: true } } }
          }
        }
      }
    }
  })

  if (!user?.accountId || !user.account?.subscription) return null

  return {
    creditsRemaining: user.account.subscription.creditsRemaining,
    planName: user.account.subscription.planRef?.name ?? null,
  }
}

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
