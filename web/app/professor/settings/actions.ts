'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteProfessorAccountCascade } from "@/lib/deleteProfessorAccount"

export async function getProfessorProfileData() {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            users: {
              where: {
                role: {
                  name: 'COORDINATOR'
                }
              },
              select: {
                fullName: true,
                email: true
              },
              take: 1
            }
          }
        }
      }
    })

    if (!user) {
      return { success: false, error: "Usuário não encontrado" }
    }

    return { 
      success: true, 
      profile: {
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt,
      },
      institution: user.institution ? {
        name: user.institution.name,
        createdAt: user.institution.createdAt,
      } : null,
      coordinator: user.institution?.users?.[0] || null
    }

  } catch (error: any) {
    console.error("Erro ao buscar dados do perfil:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Exclui permanentemente a conta do professor independente logado, incluindo em
 * cascata todas as provas, questões, grupos de questões e submissões de alunos
 * criadas por ele. Exclusiva para professor SEM instituição (professor de
 * instituição precisa ser removido pelo coordenador/admin).
 */
export async function deleteMyAccountAction(confirmEmail: string) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, institutionId: true, accountId: true }
  })

  if (!user) {
    return { success: false, error: "Usuário não encontrado" }
  }

  if (user.institutionId || !user.accountId) {
    return { success: false, error: "Esta ação está disponível apenas para professores independentes." }
  }

  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { success: false, error: "O e-mail digitado não confere." }
  }

  try {
    await deleteProfessorAccountCascade(userId, user.accountId)

    return { success: true }
  } catch (error: any) {
    console.error("Erro ao excluir conta do professor:", error)
    return { success: false, error: "Erro interno ao excluir a conta." }
  }
}
