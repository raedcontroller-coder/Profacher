const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sub = await prisma.examSubmission.findFirst({
    orderBy: { startedAt: 'desc' },
    select: { id: true, studentName: true, studentRa: true, score: true, correctionDetails: true }
  });
  if (!sub) {
    console.log('Nenhuma submissão encontrada.');
    return;
  }
  console.log(`Submissão mais recente: ${sub.studentName} (RA: ${sub.studentRa}) - Nota: ${sub.score}`);
  console.log(JSON.stringify(sub.correctionDetails, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
