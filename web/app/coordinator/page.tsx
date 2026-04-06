import { auth } from "../../auth"
import { redirect } from "next/navigation"
import CoordinatorClient from "./CoordinatorClient"

export default async function CoordinatorPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Pegamos o nome direto do servidor
  const userName = session.user.name || "Usuário"

  return <CoordinatorClient initialUserName={userName} />
}
