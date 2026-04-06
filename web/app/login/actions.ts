'use server'

import { signIn } from "../../auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function loginAction(prevState: string | undefined, formData: FormData) {
  try {
    const email = formData.get("email") as string;
    
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
      console.log("AuthError Capturado:", error.type);
      return "E-mail ou senha incorretos.";
    }
    // IMPORTANTE: No Next.js 15, o redirect() joga um erro. 
    // Precisamos dar um throw nele para o Next.js completar o redirecionamento.
    throw error;
  }
}
