import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EditPhysicalClient from "./EditPhysicalClient";
import { getPhysicalExamData } from "./actions";

export default async function EditPhysicalExamPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session || (session.user as any)?.role !== "PROFESSOR") {
    redirect("/login");
  }

  const { id } = await params;
  const examId = parseInt(id);
  if (isNaN(examId)) {
    redirect("/professor/exams");
  }

  try {
    const initialData = await getPhysicalExamData(examId);
    return (
      <EditPhysicalClient 
        userName={session.user?.name || "Professor"} 
        examId={examId}
        initialData={initialData}
      />
    );
  } catch (e) {
    console.error(e);
    redirect("/professor/exams");
  }
}
