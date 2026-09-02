import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ChoosePlanClient from "./ChoosePlanClient"

export default async function ChoosePlanPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/login")
  }

  const plans = await prisma.plan.findMany({
    where: { active: true, isFree: false },
    orderBy: { priceInCents: 'asc' }
  })

  return <ChoosePlanClient plans={plans} userName={session.user.name || undefined} />
}
