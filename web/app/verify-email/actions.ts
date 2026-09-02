'use server'

import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { getBaseUrl, sendVerificationEmail } from "@/lib/email"

export async function verifyEmailTokenAction(token: string) {
  if (!token) {
    return { error: "Link de confirmação inválido." }
  }

  const verification = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!verification) {
    return { error: "Link de confirmação inválido ou já utilizado." }
  }

  if (verification.expiresAt < new Date()) {
    return { error: "Este link expirou. Solicite um novo abaixo.", expired: true, email: verification.user.email }
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: verification.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.delete({ where: { id: verification.id } }),
  ])

  return { success: true }
}

export async function resendVerificationEmailAction(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  // Mensagem genérica para não revelar se o e-mail existe ou não.
  const genericResponse = { success: true, message: "Se o e-mail estiver cadastrado e pendente de confirmação, um novo link foi enviado." }

  if (!user || user.emailVerifiedAt) {
    return genericResponse
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.emailVerificationToken.upsert({
    where: { userId: user.id },
    update: { token, expiresAt },
    create: { userId: user.id, token, expiresAt },
  })

  try {
    const baseUrl = await getBaseUrl()
    await sendVerificationEmail(user.email, user.fullName, `${baseUrl}/verify-email?token=${token}`)
  } catch (error) {
    console.error("Erro ao reenviar e-mail de confirmação:", error)
  }

  return genericResponse
}
