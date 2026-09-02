import { prisma } from "@/lib/prisma"
import { ROLES } from "@/lib/roles"

interface AccountAiConfig {
  id: number
  hasIntegratedAi: boolean
  customAiKey: string | null
  customAiModel: string | null
}

export interface UserForAiRouting {
  roleId: number
  role?: { name: string } | null
  institution: { account: AccountAiConfig } | null
  account: AccountAiConfig | null
}

export interface ResolvedAiConfig {
  aiKey: string
  aiModel: string
  fallbackKey: string
  fallbackModel: string
  accountId: number | null
}

export type ResolveAiConfigResult =
  | { success: true; config: ResolvedAiConfig }
  | { success: false; error: string }

/**
 * Decide qual chave/modelo de IA usar para um usuário, a partir da Account
 * efetiva dele (via instituição, para PROFESSOR/COORDENADOR de instituição,
 * ou direta, para professor independente). Substitui a lógica antes duplicada
 * 3x em web/app/actions/aiAction.ts.
 */
export async function resolveAiConfigForUser(user: UserForAiRouting): Promise<ResolveAiConfigResult> {
  const account = user.institution?.account ?? user.account ?? null
  const isGlobalAdmin = user.role?.name === ROLES.ADMIN

  if (account?.hasIntegratedAi || isGlobalAdmin) {
    const globalSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } })
    let fallbackKey = ""
    let fallbackModel = ""

    if (globalSettings?.savedAiKeys && Array.isArray(globalSettings.savedAiKeys)) {
      const fb = (globalSettings.savedAiKeys as any[]).find((k) => k.isFallback)
      if (fb) {
        fallbackKey = fb.key
        fallbackModel = fb.model
      }
    }

    return {
      success: true,
      config: {
        aiKey: globalSettings?.globalAiKey || "",
        aiModel: globalSettings?.globalAiModel || "gpt-4o",
        fallbackKey,
        fallbackModel,
        accountId: account?.id ?? null,
      },
    }
  }

  if (account) {
    return {
      success: true,
      config: {
        aiKey: account.customAiKey || "",
        aiModel: account.customAiModel || "gpt-4o",
        fallbackKey: "",
        fallbackModel: "",
        accountId: account.id,
      },
    }
  }

  return { success: false, error: "Sem acesso a uma API de IA configurada." }
}
