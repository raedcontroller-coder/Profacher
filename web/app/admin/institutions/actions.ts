'use server'

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

  return await prisma.institution.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: { name: 'asc' }
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
export async function createInstitution(data: { name: string; slug: string; apiKeyOpenai?: string }) {
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
export async function updateInstitution(id: number, data: { name?: string; slug?: string; apiKeyOpenai?: string }) {
  const session = await auth()
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  try {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug.toLowerCase().trim().replace(/\s+/g, '-');
    if (data.apiKeyOpenai !== undefined) updateData.apiKeyOpenai = data.apiKeyOpenai || null;

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
