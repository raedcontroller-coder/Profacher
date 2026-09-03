import { prisma } from "@/lib/prisma"
import HomeClient from "./HomeClient"

// Evita pré-renderização estática no build (que exigiria acesso ao banco durante
// a etapa de build no Coolify) — os planos são buscados em cada requisição, como
// já é feito em /register-professor/choose-plan.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const plans = await prisma.plan.findMany({
    where: { active: true, isFree: false },
    orderBy: { priceInCents: 'asc' }
  })

  return <HomeClient plans={plans} />
}
