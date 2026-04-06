import { auth } from "../../auth"
import { redirect } from "next/navigation"
import AdminClient from "./AdminClient"

export default async function AdminPage() {
  const session = await auth()

  // Verificação de segurança no servidor
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login")
  }

  // Nome capturado direto do servidor
  const userName = session.user.name || "Administrador"

  return <AdminClient initialUserName={userName} />
}
