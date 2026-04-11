import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const exam = await prisma.exam.findUnique({
    where: { accessCode: 'PYBPL' },
    include: {
      questions: {
        include: {
          question: true
        }
      }
    }
  })

  console.log(JSON.stringify(exam, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
