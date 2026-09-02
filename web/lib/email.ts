import nodemailer from "nodemailer"
import path from "path"
import { headers } from "next/headers"

export async function getBaseUrl() {
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" || host.includes("raed.world") ? "https" : "http"
  return process.env.NEXTAUTH_URL || `${protocol}://${host}`
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST as string,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string
    },
    tls: { rejectUnauthorized: false }
  })
}

export async function sendVerificationEmail(to: string, fullName: string, verifyLink: string) {
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
          Falta pouco para começar a usar o Profacher. Confirme seu e-mail clicando no botão abaixo para ativar sua conta.
        </p>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${verifyLink}" style="display: inline-block; background-color: #C0C1FF; color: #121315; font-weight: bold; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 10px 20px rgba(192, 193, 255, 0.3); border: 1px solid #C0C1FF;">
            Confirmar meu E-mail
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 0;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
          <a href="${verifyLink}" style="color: #C0C1FF; text-decoration: underline; word-break: break-all; margin-top: 8px; display: block;">${verifyLink}</a>
        </p>
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;">Este link expira em 24 horas.</p>
      </div>

      <div style="background-color: #0d0e0f; padding: 24px 30px; text-align: center;">
        <div style="margin-bottom: 20px;">
          <p style="color: #4b5563; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">Powered by</p>
          <img src="cid:raed_logo" alt="Raed Logo" style="max-width: 120px; height: auto; opacity: 0.6; display: inline-block;" />
        </div>
        <p style="color: #4b5563; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Profacher. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || '"Profacher" <convites@raed.world>',
    to,
    subject: "Confirme seu e-mail no Profacher",
    html: htmlContent,
    attachments: [
      { filename: 'blink.jpg', path: path.join(process.cwd(), 'public', 'blink.jpg'), cid: 'profacher_logo' },
      { filename: 'logobranco.png', path: path.join(process.cwd(), 'public', 'logobranco.png'), cid: 'raed_logo' }
    ]
  })
}
