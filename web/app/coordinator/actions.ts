'use server'

import { prisma } from "../../lib/prisma"
import { auth } from "../../auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function getInstitutionUsers() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  // Busca o usuário logado para pegar a institutionId
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) return []

  // Busca todos os usuários da mesma instituição
  return await prisma.user.findMany({
    where: { institutionId: currentUser.institutionId },
    include: { role: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getAiUsageByTeacher() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) return []

  const usageLogs = await prisma.aiUsageLog.groupBy({
    by: ['teacherId'],
    where: { institutionId: currentUser.institutionId },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      costInBRL: true,
    }
  })

  const teachers = await prisma.user.findMany({
    where: { id: { in: usageLogs.map(log => log.teacherId) } },
    select: { id: true, fullName: true }
  })

  return usageLogs.map(log => {
    const teacher = teachers.find(t => t.id === log.teacherId)
    return {
      teacherId: log.teacherId,
      teacherName: teacher?.fullName || "Professor Desconhecido",
      totalTokens: (log._sum.promptTokens || 0) + (log._sum.completionTokens || 0),
      totalCost: log._sum.costInBRL || 0,
    }
  }).sort((a, b) => b.totalCost - a.totalCost)
}

export async function getCoordinatorDashboardMetrics() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) {
    return {
      totalTeachers: 0,
      totalExams: 0,
      totalSubmissions: 0,
      activeExams: 0,
      recentExams: []
    }
  }

  const institutionId = currentUser.institutionId

  // Total Teachers
  const totalTeachers = await prisma.user.count({
    where: { institutionId, role: { name: 'PROFESSOR' } }
  })

  // We need to find exams created by users in this institution
  // The most reliable way is finding all exams where teacher.institutionId == institutionId
  const exams = await prisma.exam.findMany({
    where: { teacher: { institutionId } },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      teacher: { select: { fullName: true } },
      _count: { select: { submissions: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const totalExams = exams.length
  const activeExams = exams.filter(e => e.status === 'STARTED').length
  const totalSubmissions = exams.reduce((acc, curr) => acc + curr._count.submissions, 0)
  
  const recentExams = exams.slice(0, 5).map(e => ({
    id: e.id,
    title: e.title,
    status: e.status,
    createdAt: e.createdAt,
    teacherName: e.teacher.fullName,
    submissions: e._count.submissions
  }))

  return {
    totalTeachers,
    totalExams,
    totalSubmissions,
    activeExams,
    recentExams
  }
}

export async function inviteUserAction({ fullName, email, roleName = "PROFESSOR" }: { fullName: string, email: string, roleName?: string }) {
  const session = await auth()
  if (!session?.user) return { error: "Não autorizado" }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { institutionId: true }
    })

    if (!currentUser?.institutionId) return { error: "Instituição não encontrada" }

    // Verifica se o e-mail já existe
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: "Este e-mail já está cadastrado." }

    // Busca o ID do cargo
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) return { error: "Cargo inválido" }

    // Senha padrão temporária
    const defaultPassword = "Profacher!2026"
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hashedPassword,
        roleId: role.id,
        institutionId: currentUser.institutionId
      }
    })

    revalidatePath("/coordinator")
    return { success: true }
  } catch (error) {
    console.error("Erro ao convidar usuário:", error)
    return { error: "Erro interno ao processar o convite." }
  }
}

export async function deleteUserAction(userId: number) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Não autorizado" }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { role: true }
    })

    if (!currentUser) return { error: "Usuário logado não encontrado" }

    const targetUser = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { role: true }
    })

    if (!targetUser) return { error: "Usuário alvo não encontrado" }

    // REGRA 1: Ninguém pode excluir a si mesmo
    if (currentUser.id === targetUser.id) {
      return { error: "Você não pode excluir sua própria conta." }
    }

    // REGRA 2: Só o ADMIN pode excluir "tudo" (outras instituições)
    // Se não for ADMIN, precisa ser da mesma instituição
    if (currentUser.role.name !== "ADMIN") {
      if (targetUser.institutionId !== currentUser.institutionId) {
        return { error: "Sem permissão para deletar usuários de outra instituição." }
      }
      
      // Coordenador não pode excluir Admin (segurança extra)
      if (targetUser.role.name === "ADMIN") {
        return { error: "Coordenadores não podem excluir administradores globais." }
      }
    }

    await prisma.user.delete({ where: { id: userId } })
    
    revalidatePath("/coordinator")
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar:", error)
    return { error: "Erro ao deletar usuário." }
  }
}
