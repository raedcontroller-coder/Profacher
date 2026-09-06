import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

// Teste de ponta a ponta do pagamento real via Stripe Checkout (modo teste). Só roda
// contra o ambiente local, com dois pré-requisitos manuais rodando ao mesmo tempo:
//
//   1. `npm run dev` com STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET definidos no
//      web/.env (o segundo é o secret impresso pelo comando abaixo, não o de produção).
//   2. `stripe listen --forward-to localhost:3000/api/webhooks/stripe` rodando numa
//      janela separada — é isso que entrega o webhook `checkout.session.completed`
//      pro servidor local depois do pagamento, exatamente como o Stripe faria em produção.
//
// Rodar com:
//   DATABASE_URL="<mesma do web/.env>" PLAYWRIGHT_BASE_URL=http://localhost:3000 \
//     npx playwright test tests/e2e/payment-checkout.spec.ts

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const prisma = new PrismaClient();

function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.com`;
}

async function waitForActiveSubscription(accountId: number, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const subscription = await prisma.subscription.findUnique({ where: { accountId } });
    if (subscription?.status === 'ACTIVE' && subscription.planId) {
      return subscription;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return prisma.subscription.findUnique({ where: { accountId } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('Pagamento real via Stripe Checkout', () => {
  test.skip(!STRIPE_SECRET_KEY, 'STRIPE_SECRET_KEY não configurada no ambiente que roda o teste.');

  // Fixa o locale para o Stripe Checkout renderizar sempre em pt-BR (senão o idioma
  // varia conforme o navegador/ambiente e o botão "Assinar" vira "Subscribe" etc).
  test.use({ locale: 'pt-BR' });

  test('assinar o plano Start com cartão de teste ativa a assinatura via webhook', async ({ page }) => {
    test.setTimeout(60000);
    const email = uniqueEmail('payment');
    const fullName = `E2E Payment ${Date.now()}`;
    const password = 'SenhaTeste123';
    let stripeSubscriptionId: string | undefined;

    try {
      // 1. Cadastro sem VIP.
      await page.goto('/register-professor');
      await page.locator('input[name="fullName"]').fill(fullName);
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('text=Confirme seu e-mail')).toBeVisible({ timeout: 15000 });

      // 2. Confirma o e-mail via token direto do banco (sem inbox real).
      const user = await prisma.user.findUnique({ where: { email } });
      const tokenRow = await prisma.emailVerificationToken.findUnique({ where: { userId: user!.id } });
      await page.goto(`/verify-email?token=${tokenRow!.token}`);
      await expect(page.locator('text=E-mail confirmado!')).toBeVisible({ timeout: 15000 });

      // 3. Login: sem plano escolhido, deve cair na tela de escolha de plano.
      await page.goto('/login');
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/register-professor/choose-plan', { timeout: 15000 });

      // 4. Assina o plano Start -> Stripe Checkout hospedado de verdade.
      await page.locator('button:has-text("Assinar")').first().click();
      await page.waitForURL('**checkout.stripe.com**', { timeout: 15000 });

      // 5. Preenche o cartão de teste do Stripe (sempre aprova, sem 3DS) e confirma.
      await page.locator('#cardNumber').fill('4242424242424242');
      await page.locator('#cardExpiry').fill('12/34');
      await page.locator('#cardCvc').fill('123');
      await page.locator('#billingName').fill(fullName);
      await page.locator('button:has-text("Assinar")').click();

      // 6. Volta pro app (success_url) depois do pagamento.
      await page.waitForURL('**/professor**', { timeout: 30000 });

      // 7. O webhook (via `stripe listen`) deve ativar a assinatura automaticamente.
      const subscription = await waitForActiveSubscription(user!.accountId!);
      expect(subscription?.status).toBe('ACTIVE');

      const startPlan = await prisma.plan.findUnique({ where: { key: 'START' } });
      expect(subscription?.planId).toBe(startPlan!.id);
      expect(subscription?.creditsRemaining).toBe(startPlan!.credits);
      expect(subscription?.stripeCustomerId).toBeTruthy();
      expect(subscription?.stripeSubscriptionId).toBeTruthy();
      stripeSubscriptionId = subscription?.stripeSubscriptionId ?? undefined;

      // 8. O indicador de créditos na sidebar deve refletir o plano pago, não "Ilimitado".
      await expect(page.locator(`text=${startPlan!.credits} créditos`)).toBeVisible({ timeout: 10000 });
    } finally {
      if (stripeSubscriptionId && stripe) {
        await stripe.subscriptions.cancel(stripeSubscriptionId).catch(() => {});
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        if (user.accountId) {
          await prisma.account.delete({ where: { id: user.accountId } }).catch(() => {});
        }
      }
    }
  });
});
