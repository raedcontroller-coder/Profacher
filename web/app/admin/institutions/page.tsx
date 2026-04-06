import { auth } from "@/auth"
import { redirect } from "next/navigation"
import InstitutionsClient from "./InstitutionsClient"

export default async function InstitutionsPage() {
  const session = await auth()

  // Verificação de segurança mestre
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login")
  }

  const userName = session?.user?.name || "Administrador"

  return <InstitutionsClient initialUserName={userName} />
}
