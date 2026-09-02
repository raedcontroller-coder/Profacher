import { prisma } from "@/lib/prisma"

export interface ConsumeCreditsResult {
  success: boolean
  error?: string
}

/**
 * Desconta créditos de uma correção por IA. REGRA DE NEGÓCIO: só contas do tipo
 * INDIVIDUAL (professor independente) descontam crédito — instituições pagam por
 * conta própria (chave própria configurada na Account ou IA integrada da plataforma),
 * nunca por saldo de créditos, então uma Account do tipo INSTITUTION nunca é debitada
 * aqui, mesmo que por engano tivesse creditsRemaining preenchido. Contas sem accountId
 * (professor de instituição, que não tem Account própria) também não são afetadas.
 * O desconto em si é atômico (updateMany condicionado a saldo suficiente) para evitar
 * corrida entre requisições concorrentes deixando o saldo negativo.
 */
export async function consumeCredits(accountId: number | null, amount: number): Promise<ConsumeCreditsResult> {
  if (!accountId) return { success: true }

  const subscription = await prisma.subscription.findUnique({
    where: { accountId },
    select: { creditsRemaining: true, account: { select: { type: true } } }
  })

  if (!subscription || subscription.account.type !== "INDIVIDUAL" || subscription.creditsRemaining === null) {
    return { success: true }
  }

  const result = await prisma.subscription.updateMany({
    where: { accountId, creditsRemaining: { gte: amount } },
    data: { creditsRemaining: { decrement: amount } }
  })

  if (result.count === 0) {
    return { success: false, error: "Seus créditos acabaram. Adquira mais créditos para continuar corrigindo." }
  }

  return { success: true }
}
