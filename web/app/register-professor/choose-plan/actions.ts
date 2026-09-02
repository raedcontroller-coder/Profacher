'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { createCheckoutSessionForPlan, isStripeConfigured } from "@/lib/stripe"
import { getBaseUrl } from "@/lib/email"

export async function selectPlanAction(planKey: string) {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: "Não autorizado" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, accountId: true, fullName: true }
  })

  if (!user?.accountId) {
    return { error: "Esta tela é exclusiva para professores independentes." }
  }

  const plan = await prisma.plan.findUnique({ where: { key: planKey } })
  if (!plan || !plan.active || plan.isFree) {
    return { error: "Plano inválido." }
  }

  const baseUrl = await getBaseUrl()

  if (isStripeConfigured() && plan.stripePriceId) {
    const checkoutUrl = await createCheckoutSessionForPlan({
      stripePriceId: plan.stripePriceId,
      customerEmail: session.user.email,
      successUrl: `${baseUrl}/professor`,
      cancelUrl: `${baseUrl}/register-professor/choose-plan`,
      metadata: { accountId: String(user.accountId), planKey: plan.key },
    })

    if (checkoutUrl) {
      redirect(checkoutUrl)
    }
  }

  // Stripe ainda não configurado (ou plano sem stripePriceId): libera acesso provisório
  // até a cobrança real ser ligada, conforme decisão de produto.
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { accountId: user.accountId },
    data: {
      status: "PENDING_PAYMENT",
      plan: "INDIVIDUAL_MONTHLY",
      planId: plan.id,
      creditsRemaining: plan.credits,
      currentPeriodEnd,
    }
  })

  redirect("/professor")
}
