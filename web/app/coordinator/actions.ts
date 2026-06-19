'use server'

import { prisma } from "../../lib/prisma"
import { auth } from "../../auth"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import bcrypt from "bcryptjs"
import nodemailer from "nodemailer"
import path from "path"
import crypto from "crypto"

export async function getInstitutionUsers() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  // Busca o usuário logado para pegar a institutionId
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) return []

  // Busca todos os usuários da mesma instituição
  return await prisma.user.findMany({
    where: { institutionId: currentUser.institutionId },
    include: { role: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getPendingInvitationsAction() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) return []

  return await prisma.invitation.findMany({
    where: { 
      institutionId: currentUser.institutionId,
      status: "PENDING",
      expiresAt: { gt: new Date() }
    },
    include: { role: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function cancelInvitationAction(invitationId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")
  
  await prisma.invitation.delete({
    where: { id: invitationId }
  })
  
  revalidatePath("/coordinator")
  return { success: true }
}

export async function getAiUsageByTeacher() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) return []

  const usageLogs = await prisma.aiUsageLog.groupBy({
    by: ['teacherId'],
    where: { institutionId: currentUser.institutionId },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      costInBRL: true,
    }
  })

  const teachers = await prisma.user.findMany({
    where: { id: { in: usageLogs.map(log => log.teacherId) } },
    select: { id: true, fullName: true }
  })

  return usageLogs.map(log => {
    const teacher = teachers.find(t => t.id === log.teacherId)
    return {
      teacherId: log.teacherId,
      teacherName: teacher?.fullName || "Professor Desconhecido",
      totalTokens: (log._sum.promptTokens || 0) + (log._sum.completionTokens || 0),
      totalCost: log._sum.costInBRL || 0,
    }
  }).sort((a, b) => b.totalCost - a.totalCost)
}

export async function getCoordinatorDashboardMetrics() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { institutionId: true }
  })

  if (!currentUser?.institutionId) {
    return {
      totalTeachers: 0,
      totalExams: 0,
      totalSubmissions: 0,
      activeExams: 0,
      recentExams: []
    }
  }

  const institutionId = currentUser.institutionId

  // Total Teachers
  const totalTeachers = await prisma.user.count({
    where: { institutionId, role: { name: 'PROFESSOR' } }
  })

  // We need to find exams created by users in this institution
  // The most reliable way is finding all exams where teacher.institutionId == institutionId
  const exams = await prisma.exam.findMany({
    where: { teacher: { institutionId } },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      teacher: { select: { fullName: true } },
      _count: { select: { submissions: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const totalExams = exams.length
  const activeExams = exams.filter(e => e.status === 'STARTED').length
  const totalSubmissions = exams.reduce((acc, curr) => acc + curr._count.submissions, 0)
  
  const recentExams = exams.slice(0, 5).map(e => ({
    id: e.id,
    title: e.title,
    status: e.status,
    createdAt: e.createdAt,
    teacherName: e.teacher.fullName,
    submissions: e._count.submissions
  }))

  return {
    totalTeachers,
    totalExams,
    totalSubmissions,
    activeExams,
    recentExams
  }
}

export async function inviteUserAction({ fullName, email, roleName = "PROFESSOR" }: { fullName: string, email: string, roleName?: string }) {
  const session = await auth()
  if (!session?.user) return { error: "Não autorizado" }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, fullName: true, institutionId: true, institution: { select: { name: true } } }
    })

    if (!currentUser?.institutionId || !currentUser.institution) return { error: "Instituição não encontrada" }

    // Verifica se o e-mail já existe
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: "Este e-mail já está cadastrado." }

    // Verifica se já tem convite pendente
    const pendingInvite = await prisma.invitation.findUnique({ where: { email } })
    if (pendingInvite) {
      if (pendingInvite.status === "PENDING" && pendingInvite.expiresAt > new Date()) {
        return { error: "Um convite válido já foi enviado para este e-mail." }
      } else {
        await prisma.invitation.delete({ where: { email } })
      }
    }

    // Busca o ID do cargo
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) return { error: "Cargo inválido" }

    const token = crypto.randomUUID()

    await prisma.invitation.create({
      data: {
        email,
        token,
        roleId: role.id,
        institutionId: currentUser.institutionId,
        inviterId: currentUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST as string,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string
      },
      tls: { rejectUnauthorized: false }
    })

    const headersList = await headers()
    const host = headersList.get("host") || "localhost:3000"
    const protocol = process.env.NODE_ENV === "production" || host.includes("raed.world") ? "https" : "http"
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`

    const inviteLink = `${baseUrl}/register?token=${token}`

    const htmlContent = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121315; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a30; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
        <div style="background: linear-gradient(135deg, #1e1e24 0%, #121315 100%); padding: 40px 30px; text-align: center; border-bottom: 1px solid #2a2a30;">
          <img src="cid:profacher_logo" alt="Profacher Logo" style="max-width: 180px; width: 100%; height: auto; margin-bottom: 8px; border-radius: 8px; display: inline-block;" />
          <h1 style="color: #C0C1FF; font-family: 'Outfit', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Profacher</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 8px;">A plataforma de ensino potencializada por IA.</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Olá, <span style="color: #C0C1FF;">${fullName}</span>,</h2>
          
          <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Você foi oficialmente convidado(a) por <strong>${currentUser.fullName}</strong> para integrar a instituição <strong style="color: #ffffff;">${currentUser.institution.name}</strong> através da plataforma Profacher.
          </p>

          <div style="background-color: #1a1b1e; border-left: 4px solid #C0C1FF; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
            <p style="color: #e5e7eb; margin: 0; font-size: 15px; line-height: 1.5;">
              Sua conta já está quase pronta. Clique no botão abaixo para definir sua senha de acesso e explorar as ferramentas educacionais de próxima geração.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${inviteLink}" style="display: inline-block; background-color: #C0C1FF; color: #121315; font-weight: bold; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 10px 20px rgba(192, 193, 255, 0.3); border: 1px solid #C0C1FF;">
              Aceitar Convite e Criar Conta
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 0;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <a href="${inviteLink}" style="color: #C0C1FF; text-decoration: underline; word-break: break-all; margin-top: 8px; display: block;">${inviteLink}</a>
          </p>
        </div>

        <div style="background-color: #0d0e0f; padding: 24px 30px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <p style="color: #4b5563; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">Powered by</p>
            <img src="cid:raed_logo" alt="Raed Logo" style="max-width: 120px; height: auto; opacity: 0.6; display: inline-block;" />
          </div>
          <p style="color: #4b5563; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Profacher. Todos os direitos reservados.<br>
            Este é um e-mail automático enviado pela instituição.
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Profacher" <convites@raed.world>',
      replyTo: session.user.email as string,
      to: email,
      subject: `Convite de ${currentUser.fullName} para o Profacher`,
      html: htmlContent,
      attachments: [
        {
          filename: 'blink.jpg',
          path: path.join(process.cwd(), 'public', 'blink.jpg'),
          cid: 'profacher_logo'
        },
        {
          filename: 'logobranco.png',
          path: path.join(process.cwd(), 'public', 'logobranco.png'),
          cid: 'raed_logo'
        }
      ]
    })

    revalidatePath("/coordinator")
    return { success: true }
  } catch (error) {
    console.error("Erro ao convidar usuário:", error)
    return { error: "Erro interno ao processar o convite." }
  }
}

export async function deleteUserAction(userId: number) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Não autorizado" }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { role: true }
    })

    if (!currentUser) return { error: "Usuário logado não encontrado" }

    const targetUser = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { role: true }
    })

    if (!targetUser) return { error: "Usuário alvo não encontrado" }

    // REGRA 1: Ninguém pode excluir a si mesmo
    if (currentUser.id === targetUser.id) {
      return { error: "Você não pode excluir sua própria conta." }
    }

    // REGRA 2: Só o ADMIN pode excluir "tudo" (outras instituições)
    // Se não for ADMIN, precisa ser da mesma instituição
    if (currentUser.role.name !== "ADMIN") {
      if (targetUser.institutionId !== currentUser.institutionId) {
        return { error: "Sem permissão para deletar usuários de outra instituição." }
      }
      
      // Coordenador não pode excluir Admin (segurança extra)
      if (targetUser.role.name === "ADMIN") {
        return { error: "Coordenadores não podem excluir administradores globais." }
      }
    }

    await prisma.user.delete({ where: { id: userId } })
    
    revalidatePath("/coordinator")
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar:", error)
    return { error: "Erro ao deletar usuário." }
  }
}
