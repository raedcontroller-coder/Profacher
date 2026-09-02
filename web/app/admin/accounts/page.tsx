import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AccountsClient from "./AccountsClient"

export default async function AdminAccountsPage() {
  const session = await auth()

  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login")
  }

  const userName = session?.user?.name || "Administrador"

  return <AccountsClient initialUserName={userName} />
}
