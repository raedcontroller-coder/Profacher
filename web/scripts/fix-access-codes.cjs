const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando preenchimento de códigos de acesso...');
  
  const exams = await prisma.exam.findMany({
    where: {
      accessCode: null
    }
  });

  console.log(`Encontradas ${exams.length} provas sem código.`);

  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';

  for (const exam of exams) {
    let accessCode = '';
    let isUnique = false;

    while (!isUnique) {
      accessCode = Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      const existing = await prisma.exam.findUnique({ where: { accessCode } });
      if (!existing) isUnique = true;
    }

    await prisma.exam.update({
      where: { id: exam.id },
      data: { 
        accessCode: accessCode,
        status: 'WAITING' 
      }
    });

    console.log(`Prova ID ${exam.id} atualizada com código: ${accessCode}`);
  }

  console.log('Processo concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
