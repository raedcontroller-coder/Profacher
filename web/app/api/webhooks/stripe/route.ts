import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Este webhook fica inerte até STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET serem
// configurados no ambiente — até lá, o fluxo de assinatura usa o caminho de
// "acesso provisório" (ver web/app/register-professor/choose-plan/actions.ts).
// Configurar no painel do Stripe para apontar para: POST /api/webhooks/stripe
export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Falha ao verificar assinatura do webhook Stripe:", err.message);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const accountId = Number(session.metadata?.accountId);
        const planKey = session.metadata?.planKey;
        if (!accountId || !planKey) break;

        const plan = await prisma.plan.findUnique({ where: { key: planKey } });
        if (!plan) break;

        await prisma.subscription.update({
          where: { accountId },
          data: {
            status: "ACTIVE",
            planId: plan.id,
            creditsRemaining: plan.credits,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          }
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef = invoice.parent?.subscription_details?.subscription;
        const stripeSubscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
        if (!stripeSubscriptionId) break;

        const subscription = await prisma.subscription.findFirst({ where: { stripeSubscriptionId } });
        if (!subscription?.planId) break;

        const plan = await prisma.plan.findUnique({ where: { id: subscription.planId } });
        if (!plan) break;

        // Renovação mensal: reseta os créditos e estende o período.
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            creditsRemaining: plan.credits,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        });
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const subscription = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSub.id } });
        if (!subscription) break;

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELED", canceledAt: new Date() }
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Erro ao processar webhook Stripe:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
