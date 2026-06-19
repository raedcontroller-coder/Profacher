'use server'

import bcrypt from 'bcryptjs';
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const PAGE_SIZE = 15;

/**
 * Busca todas as instituições cadastradas com contagem de usuários
 */
export async function getInstitutions() {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  const institutions = await prisma.institution.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      hasIntegratedAi: true,
      customAiModel: true,
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
      ...inst,
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
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  try {
    const institution = await prisma.institution.create({
      data: {
        name: data.name,
        slug: data.slug.toLowerCase().trim().replace(/\s+/g, '-'),
        apiKeyOpenai: data.apiKeyOpenai || null,
        hasIntegratedAi: data.hasIntegratedAi || false,
        customAiModel: data.customAiModel || null,
        customAiKey: data.customAiKey || null,
      }
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
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  try {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug.toLowerCase().trim().replace(/\s+/g, '-');
    if (data.apiKeyOpenai !== undefined) updateData.apiKeyOpenai = data.apiKeyOpenai || null;
    if (data.hasIntegratedAi !== undefined) updateData.hasIntegratedAi = data.hasIntegratedAi;
    if (data.customAiModel !== undefined) updateData.customAiModel = data.customAiModel || null;
    if (data.customAiKey !== undefined) updateData.customAiKey = data.customAiKey || null;

    const institution = await prisma.institution.update({
      where: { id },
      data: updateData
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
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  try {
    await prisma.institution.delete({
      where: { id }
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
  if (!session || (session.user as any).role !== "ADMIN") {
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
