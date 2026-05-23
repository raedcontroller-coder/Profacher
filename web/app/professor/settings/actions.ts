'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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
