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
          return "E-mail ou senha incorretos.";
        case "CallbackRouteError":
          return "E-mail ou senha incorretos.";
        default:
          return "E-mail ou senha incorretos.";
      }
    }
    throw error
  }
}
