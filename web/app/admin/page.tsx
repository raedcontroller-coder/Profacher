import { auth } from "../../auth"
import { redirect } from "next/navigation"
import AdminClient from "./AdminClient"
import { prisma } from "@/lib/prisma"

export default async function AdminPage() {
  const session = await auth()

  // Verificação de segurança no servidor
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login")
  }

  // Nome capturado direto do servidor
  const userName = session?.user?.name || "Administrador"

  // Busca de dados reais do banco
  const totalInstitutions = await prisma.institution.count()
  const totalUsers = await prisma.user.count()
  const totalQueries = await prisma.aiUsageLog.count()

  // Avaliação de satisfação dos alunos após a prova
  const ratingGroups = await prisma.examSubmission.groupBy({
    by: ['satisfactionRating'],
    where: { satisfactionRating: { not: null } },
    _count: { satisfactionRating: true }
  })

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let totalRatings = 0
  let sumRatings = 0
  ratingGroups.forEach(g => {
    const star = g.satisfactionRating as 1 | 2 | 3 | 4 | 5
    const count = g._count.satisfactionRating
    distribution[star] = count
    totalRatings += count
    sumRatings += star * count
  })
  const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0

  return (
    <AdminClient
      initialUserName={userName}
      totalInstitutions={totalInstitutions}
      totalUsers={totalUsers}
      totalQueries={totalQueries}
      satisfactionStats={{ average: averageRating, total: totalRatings, distribution }}
    />
  )
}

