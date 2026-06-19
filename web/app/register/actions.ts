'use server'

import { prisma } from "../../lib/prisma"
import bcrypt from "bcryptjs"

export async function validateTokenAction(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token }
  })

  if (!invitation) return { error: "Convite inválido ou não encontrado." }
  if (invitation.status !== "PENDING") return { error: "Este convite já foi utilizado." }
  if (invitation.expiresAt < new Date()) return { error: "Este convite já expirou." }

  return { 
    success: true, 
    email: invitation.email,
  }
}

export async function registerUserAction(formData: FormData) {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  if (!token || !password || !fullName) {
    return { error: "Preencha todos os campos." }
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token }
  })

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return { error: "Convite inválido ou expirado." }
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    // Cria o usuário
    await prisma.user.create({
      data: {
        fullName,
        email: invitation.email,
        passwordHash: hashedPassword,
        roleId: invitation.roleId,
        institutionId: invitation.institutionId
      }
    })

    // Marca o convite como aceito
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" }
    })

    return { success: true }
  } catch (error) {
    console.error("Erro ao registrar usuário:", error)
    return { error: "Erro interno ao processar o registro." }
  }
}
