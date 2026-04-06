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

export async function inviteUserAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "Não autorizado" }

  const fullName = formData.get("fullName") as string
  const email = formData.get("email") as string
  const roleName = formData.get("role") as string || "PROFESSOR"

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
