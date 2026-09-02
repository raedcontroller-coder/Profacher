import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando inclusão de dados (Seed)...')

  // 1. Criar os Cargos (Roles)
  const roles = [
    { name: 'ADMIN' },
    { name: 'COORDINATOR' },
    { name: 'PROFESSOR' },
    { name: 'STUDENT' },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    })
  }

  console.log('✓ Cargos criados.')

  // 1.5 Criar os Planos de assinatura para professores independentes
  const plans = [
    { key: 'START', name: 'Start', credits: 250, priceInCents: 2990, isFree: false, active: true },
    { key: 'TURBO', name: 'Turbo', credits: 600, priceInCents: 5990, isFree: false, active: true },
    { key: 'ULTRA', name: 'Ultra', credits: 1500, priceInCents: 12990, isFree: false, active: true },
    { key: 'VIP', name: 'VIP', credits: null, priceInCents: 0, isFree: true, active: true },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      update: { name: plan.name, credits: plan.credits, priceInCents: plan.priceInCents, isFree: plan.isFree },
      create: plan,
    })
  }

  console.log('✓ Planos criados.')

  // 2. Criar o Usuário Global Admin
  const adminEmail = 'glenarison@gmail.com'
  const adminPassword = 'Aron99270594*'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })

  if (adminRole) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: hashedPassword,
        fullName: 'Glen',
        roleId: adminRole.id,
      },
      create: {
        email: adminEmail,
        passwordHash: hashedPassword,
        fullName: 'Glen',
        roleId: adminRole.id,
      },
    })
    console.log(`✓ Global Admin criado: ${adminEmail}`)
  }

  console.log('Seed finalizado com sucesso!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
