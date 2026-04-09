import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ExamsClient from "./ExamsClient";

export default async function ExamsPage() {
  const session = await auth();

  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    redirect("/login");
  }

  return <ExamsClient userName={session.user?.name || "Professor"} />;
}
