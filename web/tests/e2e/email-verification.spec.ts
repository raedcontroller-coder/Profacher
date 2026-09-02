import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// Testes dinâmicos: criam e apagam professores/códigos VIP de verdade no banco.
// Precisam falar com o MESMO banco que está por trás do PLAYWRIGHT_BASE_URL usado
// na execução (local: exporte DATABASE_URL igual ao de web/.env antes de rodar;
// contra o HML publicado, deixe DATABASE_URL sem definir para o playwright.config.ts
// carregar o valor de web/.env.hml normalmente).
const prisma = new PrismaClient();

function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.com`;
}

async function deleteTestProfessor(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  if (user.accountId) {
    await prisma.account.delete({ where: { id: user.accountId } }).catch(() => {});
  }
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('Confirmação de e-mail no cadastro de professor independente', () => {

  test('bloqueia login até confirmar o e-mail, e libera após clicar no link', async ({ page }) => {
    const email = uniqueEmail('verify');
    const fullName = `E2E Verify ${Date.now()}`;
    const password = 'SenhaTeste123';

    try {
      // 1. Cadastro sem código VIP: não deve logar automaticamente.
      await page.goto('/register-professor');
      await page.locator('input[name="fullName"]').fill(fullName);
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.locator('button[type="submit"]').click();

      await expect(page.locator('text=Confirme seu e-mail')).toBeVisible({ timeout: 15000 });
      const cookiesAfterRegister = await page.context().cookies();
      expect(cookiesAfterRegister.some(c => c.name.includes('session-token'))).toBe(false);

      const userAfterRegister = await prisma.user.findUnique({ where: { email } });
      expect(userAfterRegister?.emailVerifiedAt).toBeNull();

      // 2. Tentar logar antes de confirmar deve ser bloqueado, com opção de reenviar.
      await page.goto('/login');
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('button[type="submit"]').click();

      await expect(page.locator('text=Confirme seu e-mail antes de entrar')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('button:has-text("Reenviar e-mail de confirmação")')).toBeVisible();

      // 3. Confirma via o token gerado (sem depender de caixa de entrada real).
      const tokenRow = await prisma.emailVerificationToken.findUnique({ where: { userId: userAfterRegister!.id } });
      expect(tokenRow).not.toBeNull();

      await page.goto(`/verify-email?token=${tokenRow!.token}`);
      await expect(page.locator('text=E-mail confirmado!')).toBeVisible({ timeout: 15000 });

      const userAfterVerify = await prisma.user.findUnique({ where: { email } });
      expect(userAfterVerify?.emailVerifiedAt).not.toBeNull();

      const tokenAfterVerify = await prisma.emailVerificationToken.findUnique({ where: { userId: userAfterRegister!.id } });
      expect(tokenAfterVerify).toBeNull();

      // 4. Login deve funcionar normalmente agora.
      await page.goto('/login');
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/professor**', { timeout: 15000 });
    } finally {
      await deleteTestProfessor(email);
    }
  });

  test('link expirado mostra erro e o reenvio gera um novo link funcional', async ({ page }) => {
    const email = uniqueEmail('expired');
    const fullName = `E2E Expired ${Date.now()}`;
    const password = 'SenhaTeste123';

    try {
      await page.goto('/register-professor');
      await page.locator('input[name="fullName"]').fill(fullName);
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('text=Confirme seu e-mail')).toBeVisible({ timeout: 15000 });

      const user = await prisma.user.findUnique({ where: { email } });
      // Força o token existente a já ter expirado.
      await prisma.emailVerificationToken.update({
        where: { userId: user!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const expiredToken = (await prisma.emailVerificationToken.findUnique({ where: { userId: user!.id } }))!.token;

      await page.goto(`/verify-email?token=${expiredToken}`);
      await expect(page.locator('text=Não foi possível confirmar')).toBeVisible({ timeout: 15000 });

      await page.locator('input[type="email"]').fill(email);
      await page.locator('button:has-text("Reenviar link de confirmação")').click();
      await expect(page.locator('text=Se o e-mail estiver cadastrado')).toBeVisible({ timeout: 15000 });

      const newTokenRow = await prisma.emailVerificationToken.findUnique({ where: { userId: user!.id } });
      expect(newTokenRow?.token).not.toBe(expiredToken);

      await page.goto(`/verify-email?token=${newTokenRow!.token}`);
      await expect(page.locator('text=E-mail confirmado!')).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteTestProfessor(email);
    }
  });

  test('cadastro com Código VIP também exige confirmação de e-mail', async ({ page }) => {
    const email = uniqueEmail('vip');
    const fullName = `E2E Vip ${Date.now()}`;
    const password = 'SenhaTeste123';
    const vipCode = `VIP-E2E-${Date.now().toString().slice(-6)}`;

    await prisma.vipCode.create({ data: { code: vipCode, note: 'e2e-email-verification' } });

    try {
      await page.goto('/register-professor');
      await page.locator('input[name="fullName"]').fill(fullName);
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.locator('input[name="vipCode"]').fill(vipCode);
      await page.locator('button[type="submit"]').click();

      await expect(page.locator('text=Confirme seu e-mail')).toBeVisible({ timeout: 15000 });
      const cookies = await page.context().cookies();
      expect(cookies.some(c => c.name.includes('session-token'))).toBe(false);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.emailVerifiedAt).toBeNull();

      const redeemedCode = await prisma.vipCode.findUnique({ where: { code: vipCode } });
      expect(redeemedCode?.usedByUserId).toBe(user?.id);
    } finally {
      await deleteTestProfessor(email);
      await prisma.vipCode.delete({ where: { code: vipCode } }).catch(() => {});
    }
  });

});
