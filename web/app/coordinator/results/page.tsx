import { auth } from "../../../auth"
import { redirect } from "next/navigation"
import ResultsClient from "./ResultsClient"
import { getCoordinatorResultsAction } from "../actions"

export default async function CoordinatorResultsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  const results = await getCoordinatorResultsAction()

  return <ResultsClient initialResults={results} userName={session.user.name || "Coordenador"} />
}
