import { auth } from "@/auth"
import { redirect } from "next/navigation"
import PhysicalCorrectionClient from "./PhysicalCorrectionClient"

export default async function PhysicalCorrectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session || (session.user as any).role !== "PROFESSOR") {
    redirect("/login")
  }

  const { id } = await params;

  return <PhysicalCorrectionClient examId={Number(id)} userName={session.user?.name || "Professor"} />
}
