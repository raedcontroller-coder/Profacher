import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ProfessorClient from "./ProfessorClient"

export default async function ProfessorPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if ((session.user as any).role !== "PROFESSOR") {
    // Redireciona para a área correta se ele tiver outra role
    if ((session.user as any).role === "ADMIN") redirect("/admin")
    if ((session.user as any).role === "COORDINATOR") redirect("/coordinator")
    redirect("/login")
  }

  return <ProfessorClient userName={session.user?.name || "Professor"} />
}
