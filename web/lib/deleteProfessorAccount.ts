import { prisma } from "@/lib/prisma"

/**
 * Exclui permanentemente um professor independente e tudo que ele criou: provas
 * (cascata: questões-da-prova e submissões de alunos), questões (cascata: alternativas),
 * grupos de questões, logs de uso de IA, e a Account/Subscription. Desvincula (sem apagar)
 * qualquer código VIP que ele tenha resgatado. Usado tanto pela autoexclusão do próprio
 * professor quanto pela exclusão feita pelo Global Admin.
 */
export async function deleteProfessorAccountCascade(userId: number, accountId: number) {
  await prisma.$transaction([
    prisma.vipCode.updateMany({ where: { usedByUserId: userId }, data: { usedByUserId: null } }),
    prisma.aiUsageLog.deleteMany({ where: { teacherId: userId } }),
    // Cascade automático: apaga ExamQuestion e ExamSubmission vinculados a cada prova.
    prisma.exam.deleteMany({ where: { teacherId: userId } }),
    // Cascade automático: apaga QuestionOption vinculado a cada questão.
    prisma.question.deleteMany({ where: { teacherId: userId } }),
    prisma.questionGroup.deleteMany({ where: { teacherId: userId } }),
    // Cascade automático: apaga Invitation onde este usuário é o convidador.
    prisma.user.delete({ where: { id: userId } }),
    // Cascade automático: apaga a Subscription vinculada.
    prisma.account.delete({ where: { id: accountId } }),
  ])
}
