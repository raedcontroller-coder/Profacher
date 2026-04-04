'use server'

import { signIn } from "../../auth"
import { AuthError } from "next-auth"

export async function loginAction(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/admin",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      console.log("AuthError Capturado:", error.type, error.cause?.err?.message);
      switch (error.type) {
        case "CredentialsSignin":
          return `[FALHA_DE_LOGIN]: ${error.cause?.err?.message || "Erro de credenciais genérico"}`;
        case "CallbackRouteError":
          return `[ERRO_NO_CATCH]: ${error.cause?.err?.message || "Erro de rota"}`;
        default:
          return `[ERRO_INTERNO]: ${error.type} - ${error.cause?.err?.message || "Desconhecido"}`;
      }
    }
    throw error
  }
}
