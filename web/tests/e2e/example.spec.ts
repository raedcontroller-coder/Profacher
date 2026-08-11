import { test, expect } from '@playwright/test';

test('pagina inicial deve carregar corretamente', async ({ page }) => {
  await page.goto('/');

  // Exemplo de teste simples
  // Aguarda que a página possua um título ou texto característico.
  // Ajuste esse seletor para algo que realmente exista na sua homepage.
  await expect(page).toHaveTitle(/Profacher/i);
});
