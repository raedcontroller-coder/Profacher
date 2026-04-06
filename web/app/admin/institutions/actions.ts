'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

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
