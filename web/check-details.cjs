const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sub = await prisma.examSubmission.findUnique({
    where: { id: 253 }
  });
  console.log(JSON.stringify(sub.correctionDetails, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
