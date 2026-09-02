'use server'

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { ROLES } from "@/lib/roles"
import { getBaseUrl, sendVerificationEmail } from "@/lib/email"

export async function registerIndependentProfessorAction(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const vipCodeInput = (formData.get('vipCode') as string | null)?.trim().toUpperCase() || null

  if (!fullName || !email || !password || !confirmPassword) {
    return { error: "Preencha todos os campos." }
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." }
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." }
  }

  const normalizedEmail = email.toLowerCase().trim()

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    return { error: "Este e-mail já está cadastrado." }
  }

  const professorRole = await prisma.role.findUnique({ where: { name: ROLES.PROFESSOR } })
  if (!professorRole) {
    return { error: "Erro interno: cargo de professor não configurado." }
  }

  let vipCode = null
  if (vipCodeInput) {
    vipCode = await prisma.vipCode.findUnique({ where: { code: vipCodeInput } })
    if (!vipCode || vipCode.usedByUserId) {
      return { error: "Código de convite inválido ou já utilizado." }
    }
  }

  const verificationToken = crypto.randomUUID()

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          type: "INDIVIDUAL",
          name: fullName,
          hasIntegratedAi: false,
        }
      })

      if (vipCode) {
        const vipPlan = await tx.plan.findUnique({ where: { key: "VIP" } })
        await tx.subscription.create({
          data: { accountId: account.id, status: "ACTIVE", plan: "INDIVIDUAL_VIP", planId: vipPlan?.id ?? null, creditsRemaining: null }
        })
      } else {
        await tx.subscription.create({
          data: { accountId: account.id, status: "TRIAL", plan: "INDIVIDUAL_MONTHLY", planId: null, creditsRemaining: null, trialEndsAt }
        })
      }

      const user = await tx.user.create({
        data: {
          fullName,
          email: normalizedEmail,
          passwordHash: hashedPassword,
          roleId: professorRole.id,
          accountId: account.id,
        }
      })

      if (vipCode) {
        // Atômico: falha (e reverte a transação) se o código já tiver sido usado por outra requisição concorrente.
        const redeemed = await tx.vipCode.updateMany({
          where: { id: vipCode.id, usedByUserId: null },
          data: { usedByUserId: user.id, usedAt: new Date() }
        })
        if (redeemed.count === 0) {
          throw new Error("VIP_CODE_ALREADY_USED")
        }
      }

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
      })
    })
  } catch (error: any) {
    if (error.message === "VIP_CODE_ALREADY_USED") {
      return { error: "Código de convite inválido ou já utilizado." }
    }
    if (error.code === 'P2002') {
      return { error: "Este e-mail já está cadastrado." }
    }
    console.error("Erro ao registrar professor independente:", error)
    return { error: "Erro interno ao processar o cadastro." }
  }

  try {
    const baseUrl = await getBaseUrl()
    await sendVerificationEmail(normalizedEmail, fullName, `${baseUrl}/verify-email?token=${verificationToken}`)
  } catch (error) {
    console.error("Erro ao enviar e-mail de confirmação:", error)
  }

  return { success: true, pendingVerification: true, email: normalizedEmail }
}
