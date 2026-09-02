import Stripe from "stripe"

// Fica inerte enquanto STRIPE_SECRET_KEY não estiver configurada — a integração real
// (checkout hospedado + webhook) só entra em vigor quando as chaves forem adicionadas
// ao ambiente. Até lá, o fluxo de assinatura usa o caminho de "acesso provisório"
// (ver web/app/register-professor/choose-plan/actions.ts).
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export function isStripeConfigured(): boolean {
  return !!stripe
}

interface CreateCheckoutSessionParams {
  stripePriceId: string
  customerEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

/**
 * Cria uma sessão de checkout hospedada pelo Stripe (assinatura mensal).
 * Retorna null se o Stripe não estiver configurado ou o plano não tiver stripePriceId ainda.
 */
export async function createCheckoutSessionForPlan(params: CreateCheckoutSessionParams): Promise<string | null> {
  if (!stripe) return null

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: params.stripePriceId, quantity: 1 }],
    customer_email: params.customerEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  })

  return session.url
}
