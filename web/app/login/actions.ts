'use server'

import { signIn } from "../../auth"
import { AuthError } from "next-auth"

export async function loginAction(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      // Por enquanto mandamos para /coordinator se for a Débora, ou /admin se for o Glen
      // No futuro podemos automatizar isso no middleware baseado no cargo
      redirectTo: formData.get("email") === 'debora.machado@fecap.br' ? "/coordinator" : "/admin",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      console.log("AuthError Capturado:", error.type);
      return "E-mail ou senha incorretos.";
    }
    // IMPORTANTE: No Next.js 15, o redirect() joga um erro. 
    // Precisamos dar um throw nele para o Next.js completar o redirecionamento.
    throw error;
  }
}
