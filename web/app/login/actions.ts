'use server'

import { signIn } from "../../auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"

export type LoginState = {
  error: string
  emailNotVerified?: boolean
  email?: string
} | undefined

// authorize() (em auth.ts) encapsula o erro original numa cadeia de causas
// (Detalhe_Authorize: CODIGO -> CallbackRouteError). Percorre a cadeia procurando
// um dos códigos conhecidos, em vez de depender do formato exato de cada camada.
function extractAuthorizeErrorCode(error: unknown): string | null {
  let current: any = error
  const seen = new Set<any>()
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    if (typeof current.message === "string") {
      const match = current.message.match(/EMAIL_NOT_VERIFIED|INVALID_PASSWORD|USER_NOT_FOUND_OR_NO_HASH/)
      if (match) return match[0]
    }
    current = current.cause?.err ?? current.cause
  }
  return null
}

export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email") as string;

  try {
    // Buscar o cargo para redirecionamento dinâmico
    const userRole = await prisma.user.findUnique({
      where: { email },
      select: { role: { select: { name: true } } }
    });

    let redirectTo = "/dashboard"; // Default fallback
    if (userRole?.role.name === "ADMIN") redirectTo = "/admin";
    else if (userRole?.role.name === "COORDINATOR") redirectTo = "/coordinator";
    else if (userRole?.role.name === "PROFESSOR") redirectTo = "/professor";

    await signIn("credentials", {
      email,
      password: formData.get("password") as string,
      redirectTo,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const code = extractAuthorizeErrorCode(error)
      console.log("AuthError Capturado:", error.type, code);
      if (code === "EMAIL_NOT_VERIFIED") {
        return {
          error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
          emailNotVerified: true,
          email,
        };
      }
      return { error: "E-mail ou senha incorretos." };
    }
    // IMPORTANTE: No Next.js 15, o redirect() joga um erro.
    // Precisamos dar um throw nele para o Next.js completar o redirecionamento.
    throw error;
  }
}
