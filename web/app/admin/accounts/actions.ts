'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { ROLES } from "@/lib/roles"
import { deleteProfessorAccountCascade } from "@/lib/deleteProfessorAccount"
import crypto from "crypto"

const ACCOUNTS_PAGE_SIZE = 10;

export async function getIndividualAccounts(page: number = 1, search: string = '') {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  const trimmedSearch = search.trim();
  const where = {
    type: "INDIVIDUAL" as const,
    ...(trimmedSearch && {
      users: {
        some: {
          OR: [
            { fullName: { contains: trimmedSearch, mode: "insensitive" as const } },
            { email: { contains: trimmedSearch, mode: "insensitive" as const } },
          ]
        }
      }
    })
  };

  const skip = (page - 1) * ACCOUNTS_PAGE_SIZE;

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      include: {
        subscription: { include: { planRef: true } },
        users: { select: { id: true, fullName: true, email: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: ACCOUNTS_PAGE_SIZE,
    }),
    prisma.account.count({ where }),
  ]);

  return {
    accounts,
    total,
    totalPages: Math.ceil(total / ACCOUNTS_PAGE_SIZE),
    currentPage: page,
  };
}

export async function updateSubscriptionStatusAction(accountId: number, status: "TRIAL" | "PENDING_PAYMENT" | "ACTIVE" | "PAST_DUE" | "CANCELED") {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    await prisma.subscription.update({
      where: { accountId },
      data: {
        status,
        canceledAt: status === "CANCELED" ? new Date() : null,
      }
    });

    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao atualizar assinatura: " + error.message };
  }
}

function generateReadableCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 8);
  return `VIP-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export async function getVipCodes() {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  return prisma.vipCode.findMany({
    include: { usedBy: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
}

export async function generateVipCodeAction(note?: string) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  const code = await prisma.vipCode.create({
    data: {
      code: generateReadableCode(),
      createdByEmail: session.user?.email || null,
      note: note || null,
    }
  });

  revalidatePath('/admin/accounts');
  return { success: true, code };
}

export async function getPlans() {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  return prisma.plan.findMany({ orderBy: { priceInCents: 'asc' } });
}

export async function updatePlanAction(planId: number, data: { credits?: number | null, priceInCents?: number, active?: boolean, stripePriceId?: string | null }) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    await prisma.plan.update({ where: { id: planId }, data });
    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao atualizar plano: " + error.message };
  }
}

export async function assignPlanToAccountAction(accountId: number, planId: number) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    // Só contas INDIVIDUAL (professor independente) usam Plan/créditos — instituições
    // pagam por conta própria (chave própria ou IA integrada), nunca por crédito.
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { type: true } });
    if (account?.type !== "INDIVIDUAL") {
      return { success: false, error: "Só é possível atribuir um plano a uma conta de professor independente." };
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return { success: false, error: "Plano não encontrado" };

    await prisma.subscription.update({
      where: { accountId },
      data: {
        planId: plan.id,
        creditsRemaining: plan.credits,
        plan: plan.isFree ? "INDIVIDUAL_VIP" : "INDIVIDUAL_MONTHLY",
        status: plan.isFree ? "ACTIVE" : "PENDING_PAYMENT",
      }
    });

    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao atribuir plano: " + error.message };
  }
}

export async function grantVipAction(accountId: number) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { type: true } });
    if (account?.type !== "INDIVIDUAL") {
      return { success: false, error: "Só é possível conceder VIP a uma conta de professor independente." };
    }

    const vipPlan = await prisma.plan.findUnique({ where: { key: "VIP" } });
    if (!vipPlan) return { success: false, error: "Plano VIP não configurado" };

    await prisma.subscription.update({
      where: { accountId },
      data: {
        planId: vipPlan.id,
        creditsRemaining: null,
        plan: "INDIVIDUAL_VIP",
        status: "ACTIVE",
      }
    });

    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao conceder VIP: " + error.message };
  }
}

/**
 * Exclui permanentemente um professor independente (e tudo que ele criou) a pedido
 * do Global Admin. `confirmName` precisa bater com o nome do professor, como
 * confirmação de segurança.
 */
export async function adminDeleteProfessorAction(accountId: number, confirmName: string) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { type: true, users: { select: { id: true, fullName: true } } }
  });

  if (account?.type !== "INDIVIDUAL") {
    return { success: false, error: "Só é possível excluir uma conta de professor independente." };
  }

  const professor = account.users[0];
  if (!professor) {
    return { success: false, error: "Professor não encontrado nesta conta." };
  }

  if (confirmName.trim().toLowerCase() !== professor.fullName.trim().toLowerCase()) {
    return { success: false, error: "O nome digitado não confere." };
  }

  try {
    await deleteProfessorAccountCascade(professor.id, accountId);
    revalidatePath('/admin/accounts');
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir professor:", error);
    return { success: false, error: "Erro interno ao excluir o professor." };
  }
}
