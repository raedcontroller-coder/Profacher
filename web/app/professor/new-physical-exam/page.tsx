import { auth } from "@/auth"
import { redirect } from "next/navigation"
import NewPhysicalExamClient from "./NewPhysicalExamClient"

export default async function NewPhysicalExamPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if ((session.user as any).role !== "PROFESSOR") {
    redirect("/login")
  }

  return <NewPhysicalExamClient userName={session.user?.name || "Professor"} />
}
