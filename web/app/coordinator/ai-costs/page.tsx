import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import AiCostsClient from "./AiCostsClient";

export default async function AiCostsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name || "Usuário";

  return <AiCostsClient initialUserName={userName} />;
}
