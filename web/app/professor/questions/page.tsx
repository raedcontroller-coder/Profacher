import { auth } from "@/auth"
import { redirect } from "next/navigation"
import QuestionsClient from "./QuestionsClient"

export default async function QuestionsPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const role = (session.user as any).role
  if (role !== "PROFESSOR" && role !== "ADMIN" && role !== "COORDENADOR") {
    redirect("/login")
  }

  return <QuestionsClient userName={session.user?.name || "Professor"} />
}
