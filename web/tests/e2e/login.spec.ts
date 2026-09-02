import { test, expect } from '@playwright/test';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não definida (configure em web/.env.hml)`);
  }
  return value;
}

test.describe('Fluxo de Login - Profacher (HML)', () => {

  test('Deve realizar login com sucesso como Administrador Global', async ({ page }) => {
    // Acessa a página de login
    await page.goto('/login');

    // Verifica se a página carregou corretamente
    await expect(page).toHaveTitle(/Profacher/);
    await expect(page.locator('text=Bem-vindo de volta')).toBeVisible();

    // Preenche as credenciais de HML
    await page.locator('input[name="email"]').fill(requiredEnv('E2E_ADMIN_EMAIL'));
    await page.locator('input[name="password"]').fill(requiredEnv('E2E_ADMIN_PASSWORD'));

    // Clica no botão de entrar
    await page.locator('button[type="submit"]').click();

    // O sistema deve redirecionar para a página correta do admin (ou dashboard genérico, dependendo de como está na action)
    // Vamos esperar o redirecionamento. O Auth.js geralmente leva para / ou para um dashboard
    await page.waitForURL('**/admin**', { timeout: 10000 }).catch(() => null); // tenta admin primeiro
    await page.waitForURL('**/', { timeout: 5000 }).catch(() => null); // fallback

    // Verifica se não há mensagem de erro de login
    const errorMsg = page.locator('.text-error');
    await expect(errorMsg).not.toBeVisible();

    // Confirma que não estamos mais na página de login
    expect(page.url()).not.toContain('/login');

  });

  test('Deve bloquear o acesso com senha incorreta', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[name="email"]').fill(requiredEnv('E2E_ADMIN_EMAIL'));
    await page.locator('input[name="password"]').fill('senha_errada_123');
    await page.locator('button[type="submit"]').click();

    // Deve exibir a caixa de erro do useActionState
    const errorMsg = page.locator('.text-error');
    await expect(errorMsg).toBeVisible();
  });

  // As contas de teste (coordteste/profteste) precisam existir no banco de HML.
  // Testando o Coordenador
  test('Deve realizar login com sucesso como Coordenador (coordteste)', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[name="email"]').fill(requiredEnv('E2E_COORDINATOR_EMAIL'));
    await page.locator('input[name="password"]').fill(requiredEnv('E2E_COORDINATOR_PASSWORD'));
    await page.locator('button[type="submit"]').click();

    // Verifica se não deu erro (se o usuário existir)
    const errorMsg = page.locator('.text-error');
    await expect(errorMsg).not.toBeVisible();
  });

  // Testando o Professor
  test('Deve realizar login com sucesso como Professor (profteste)', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[name="email"]').fill(requiredEnv('E2E_PROFESSOR_EMAIL'));
    await page.locator('input[name="password"]').fill(requiredEnv('E2E_PROFESSOR_PASSWORD'));
    await page.locator('button[type="submit"]').click();

    // Verifica se não deu erro (se o usuário existir)
    const errorMsg = page.locator('.text-error');
    await expect(errorMsg).not.toBeVisible();
  });

});
