import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Script de backfill único (idempotente) para a camada de Account/Subscription.
// Cria uma Account (+ Subscription ACTIVE) para cada Institution existente que
// ainda não tem accountId, e propaga o accountId correspondente para os
// registros de AiUsageLog que já apontam para essa instituição.
//
// Rodar com: npx ts-node prisma/backfill-accounts.ts
async function main() {
  console.log('Iniciando backfill de Account/Subscription...')

  const institutions = await prisma.institution.findMany({
    where: { accountId: null },
  })

  console.log(`Instituições sem Account: ${institutions.length}`)

  for (const institution of institutions) {
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          type: 'INSTITUTION',
          name: institution.name,
          hasIntegratedAi: institution.hasIntegratedAi,
          customAiKey: institution.customAiKey,
          customAiModel: institution.customAiModel,
        },
      })

      await tx.subscription.create({
        data: {
          accountId: account.id,
          status: 'ACTIVE',
          plan: 'INSTITUTION_STANDARD',
          seats: null,
        },
      })

      await tx.institution.update({
        where: { id: institution.id },
        data: { accountId: account.id },
      })

      await tx.aiUsageLog.updateMany({
        where: { institutionId: institution.id },
        data: { accountId: account.id },
      })
    })

    console.log(`✓ Account criada para instituição "${institution.name}" (id ${institution.id})`)
  }

  const remaining = await prisma.institution.count({ where: { accountId: null } })
  console.log(`Instituições ainda sem Account após o backfill: ${remaining}`)

  console.log('Backfill finalizado.')
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
