'use server'

import bcrypt from 'bcryptjs';
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { ROLES } from "@/lib/roles"

const PAGE_SIZE = 15;

/**
 * Busca todas as instituições cadastradas com contagem de usuários
 */
export async function getInstitutions() {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  const institutions = await prisma.institution.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      account: {
        select: { hasIntegratedAi: true, customAiModel: true }
      },
      _count: {
        select: { users: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  const aiCosts = await prisma.aiUsageLog.groupBy({
    by: ['institutionId'],
    _sum: {
      costInBRL: true
    }
  });

  return institutions.map(inst => {
    const cost = aiCosts.find(c => c.institutionId === inst.id);
    return {
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      hasIntegratedAi: inst.account.hasIntegratedAi,
      customAiModel: inst.account.customAiModel,
      _count: inst._count,
      totalAiCostBrl: cost?._sum.costInBRL || 0
    };
  });
}

/**
 * Busca usuários de uma instituição específica com paginação
 */
export async function getInstitutionUsers(institutionId: number, page: number = 1) {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  const skip = (page - 1) * PAGE_SIZE;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { institutionId },
      include: { role: true },
      take: PAGE_SIZE,
      skip: skip,
      orderBy: { fullName: 'asc' }
    }),
    prisma.user.count({ where: { institutionId } })
  ]);

  return {
    users,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    currentPage: page
  };
}

/**
 * Cria uma nova instituição no banco de dados
 */
export async function createInstitution(data: {
  name: string;
  slug: string;
  apiKeyOpenai?: string;
  hasIntegratedAi?: boolean;
  customAiModel?: string;
  customAiKey?: string;
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    const institution = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          type: "INSTITUTION",
          name: data.name,
          hasIntegratedAi: data.hasIntegratedAi || false,
          customAiModel: data.customAiModel || null,
          customAiKey: data.customAiKey || null,
        }
      });

      await tx.subscription.create({
        data: {
          accountId: account.id,
          status: "ACTIVE",
          plan: "INSTITUTION_STANDARD",
        }
      });

      return tx.institution.create({
        data: {
          name: data.name,
          slug: data.slug.toLowerCase().trim().replace(/\s+/g, '-'),
          apiKeyOpenai: data.apiKeyOpenai || null,
          accountId: account.id,
          // DEPRECATED: mantidos por compatibilidade até a Migration C, refletem a Account criada acima.
          hasIntegratedAi: data.hasIntegratedAi || false,
          customAiModel: data.customAiModel || null,
          customAiKey: data.customAiKey || null,
        }
      });
    });

    revalidatePath('/admin/institutions');
    return { success: true, institution };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Uma instituição com este slug já existe." };
    }
    return { success: false, error: "Erro ao criar instituição: " + error.message };
  }
}

/**
 * Atualiza os dados de uma instituição
 */
export async function updateInstitution(id: number, data: {
  name?: string;
  slug?: string;
  apiKeyOpenai?: string;
  hasIntegratedAi?: boolean;
  customAiModel?: string;
  customAiKey?: string;
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    const institutionUpdateData: any = {};
    if (data.name) institutionUpdateData.name = data.name;
    if (data.slug) institutionUpdateData.slug = data.slug.toLowerCase().trim().replace(/\s+/g, '-');
    if (data.apiKeyOpenai !== undefined) institutionUpdateData.apiKeyOpenai = data.apiKeyOpenai || null;

    const accountUpdateData: any = {};
    if (data.name) accountUpdateData.name = data.name;
    if (data.hasIntegratedAi !== undefined) accountUpdateData.hasIntegratedAi = data.hasIntegratedAi;
    if (data.customAiModel !== undefined) accountUpdateData.customAiModel = data.customAiModel || null;
    if (data.customAiKey !== undefined) accountUpdateData.customAiKey = data.customAiKey || null;

    // DEPRECATED: mantidos por compatibilidade até a Migration C, refletem a Account atualizada abaixo.
    Object.assign(institutionUpdateData, accountUpdateData);

    const institution = await prisma.$transaction(async (tx) => {
      const current = await tx.institution.findUniqueOrThrow({ where: { id }, select: { accountId: true } });

      if (Object.keys(accountUpdateData).length > 0) {
        await tx.account.update({ where: { id: current.accountId }, data: accountUpdateData });
      }

      return tx.institution.update({
        where: { id },
        data: institutionUpdateData
      });
    });

    revalidatePath('/admin/institutions');
    return { success: true, institution };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Uma instituição com este slug já existe." };
    }
    return { success: false, error: "Erro ao atualizar instituição: " + error.message };
  }
}

/**
 * Exclui uma instituição permanentemente
 */
export async function deleteInstitution(id: number) {
  const session = await auth()
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado")
  }

  try {
    await prisma.$transaction(async (tx) => {
      const institution = await tx.institution.findUniqueOrThrow({ where: { id }, select: { accountId: true } });
      await tx.institution.delete({ where: { id } });
      await tx.account.delete({ where: { id: institution.accountId } });
    });

    revalidatePath('/admin/institutions');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Erro ao excluir instituição: " + error.message };
  }
}

/**
 * Cria um novo usuário diretamente para uma instituição existente
 */
export async function createInstitutionUser(institutionId: number, data: { fullName: string; email: string; password?: string, roleName: 'COORDINATOR' | 'PROFESSOR' }) {
  const session = await auth();
  if (!session || (session.user as any).role !== ROLES.ADMIN) {
    throw new Error("Não autorizado");
  }

  const role = await prisma.role.findUnique({ where: { name: data.roleName } });
  if (!role) throw new Error(`Role ${data.roleName} não encontrada no sistema`);

  const passwordToHash = data.password || 'Mudar123*';
  const hashedPassword = await bcrypt.hash(passwordToHash, 10);

  try {
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        roleId: role.id,
        institutionId: institutionId,
      }
    });

    revalidatePath('/admin/institutions');
    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Um usuário com este email já existe." };
    }
    return { success: false, error: "Erro ao criar usuário: " + error.message };
  }
}
