import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { role: true },
          })

          if (!user || !user.passwordHash) {
            throw new Error("USER_NOT_FOUND_OR_NO_HASH")
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          )

          if (!isValid) {
            throw new Error("INVALID_PASSWORD")
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.fullName,
            role: user.role.name,
          }
        } catch (e: any) {
          console.error("ERRO GRAVE NO AUTHORIZE:", e.message || e);
          throw new Error("Detalhe_Authorize: " + (e.message || "Erro desconhecido"));
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
})
