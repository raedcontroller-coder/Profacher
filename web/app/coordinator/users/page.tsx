import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function CoordinatorUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name || "Usuário";

  return <UsersClient initialUserName={userName} />;
}
