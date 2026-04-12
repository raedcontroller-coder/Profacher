import { auth } from "@/auth";
import { getExamForEdit } from "../../actions";
import EditExamClient from "./EditExamClient";
import { redirect } from "next/navigation";

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || (session.user as any).role !== "PROFESSOR") {
    redirect("/login");
  }

  const result = await getExamForEdit(Number(id));

  if (!result.success || !result.exam) {
    return (
      <div className="bg-[#121315] min-h-screen text-on-surface flex items-center justify-center p-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-red-400">Erro ao carregar prova</h2>
          <p className="text-gray-500">{result.error || "A prova não foi encontrada ou você não tem permissão para editá-la."}</p>
          <a href="/professor/exams" className="inline-block px-6 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all font-bold">Voltar para Minhas Provas</a>
        </div>
      </div>
    );
  }

  return <EditExamClient userName={session.user?.name || ''} initialData={result.exam as any} />;
}
