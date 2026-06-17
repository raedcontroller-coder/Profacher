import { auth } from "@/auth"
import { redirect } from "next/navigation"
import PhysicalCorrectionClient from "./PhysicalCorrectionClient"

export default async function PhysicalCorrectionPage({ params }: { params: { id: string } }) {
  const session = await auth()

  if (!session || (session.user as any).role !== "PROFESSOR") {
    redirect("/login")
  }

  // Next.js params in newer versions might need to be awaited
  // In Next.js 14 it's fine, let's keep it simple
  return <PhysicalCorrectionClient examId={Number(params.id)} userName={session.user?.name || "Professor"} />
}
