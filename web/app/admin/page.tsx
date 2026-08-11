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

  return (
    <AdminClient 
      initialUserName={userName} 
      totalInstitutions={totalInstitutions}
      totalUsers={totalUsers}
      totalQueries={totalQueries}
    />
  )
}

