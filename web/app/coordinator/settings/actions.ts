'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function getCoordinatorProfileData() {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "COORDENADOR" && (session.user as any).role !== "COORDINATOR" || !userId) {
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
            _count: {
              select: {
                users: {
                  where: {
                    role: {
                      name: 'PROFESSOR'
                    }
                  }
                }
              }
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
        professorsCount: user.institution._count.users
      } : null
    }

  } catch (error: any) {
    console.error("Erro ao buscar dados do perfil:", error)
    return { success: false, error: error.message }
  }
}
