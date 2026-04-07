'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/**
 * Busca as configurações globais de IA
 */
export async function getGlobalAiSettings() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  // Garantir que o registro id: 1 existe
  let settings = await prisma.globalSettings.findUnique({
    where: { id: 1 }
  });

  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: { id: 1, globalAiModel: 'gpt-4o', globalAiKey: '' }
    });
  }

  return settings;
}

/**
 * Atualiza as configurações globais de IA
 */
export async function updateGlobalAiSettings(data: { globalAiModel: string; globalAiKey: string }) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== "ADMIN") {
    throw new Error("Não autorizado")
  }

  try {
    await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: {
        globalAiModel: data.globalAiModel,
        globalAiKey: data.globalAiKey,
      },
      create: {
        id: 1,
        globalAiModel: data.globalAiModel,
        globalAiKey: data.globalAiKey,
      },
    });

    revalidatePath('/admin/settings/ai');
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar IA global:", error);
    return { success: false, error: error.message };
  }
}
