import { prisma } from "@/lib/prisma"
import HomeClient from "./HomeClient"

export default async function Home() {
  const plans = await prisma.plan.findMany({
    where: { active: true, isFree: false },
    orderBy: { priceInCents: 'asc' }
  })

  return <HomeClient plans={plans} />
}
