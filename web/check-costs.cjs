const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.aiUsageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      teacher: { select: { fullName: true, email: true } },
      institution: { select: { name: true } }
    }
  });

  console.log(`\n--- Últimos ${logs.length} Registros de Uso de IA ---`);
  let totalCostBrl = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const log of logs) {
    totalCostBrl += log.costInBRL;
    totalPromptTokens += log.promptTokens;
    totalCompletionTokens += log.completionTokens;
    console.log(`[${log.createdAt.toISOString()}] Modelo: ${log.modelUsed} | Tokens In/Out: ${log.promptTokens}/${log.completionTokens} | Custo: R$ ${log.costInBRL.toFixed(4)} | Professor: ${log.teacher?.fullName || 'N/A'}`);
  }

  console.log('\n--- Resumo dos últimos registros ---');
  console.log('Total de Tokens de Entrada:', totalPromptTokens);
  console.log('Total de Tokens de Saída:', totalCompletionTokens);
  console.log('Custo Total Estimado (BRL): R$', totalCostBrl.toFixed(4));
}
run().catch(console.error).finally(() => prisma.$disconnect());
