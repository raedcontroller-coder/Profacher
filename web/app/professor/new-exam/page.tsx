import { auth } from "@/auth"
import { redirect } from "next/navigation"
import NewExamClient from "./NewExamClient"

export default async function NewExamPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if ((session.user as any).role !== "PROFESSOR") {
    redirect("/login")
  }

  return <NewExamClient userName={session.user?.name || "Professor"} />
}
