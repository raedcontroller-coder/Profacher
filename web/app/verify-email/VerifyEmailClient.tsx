'use client'

import React, { useState } from 'react'
import { resendVerificationEmailAction } from './actions'

type Result = { success?: boolean, error?: string, expired?: boolean, email?: string }

export default function VerifyEmailClient({ result }: { result: Result }) {
  const [email, setEmail] = useState(result.email || '')
  const [sending, setSending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function handleResend() {
    if (!email) return
    setSending(true)
    setResendMessage(null)
    try {
      const res = await resendVerificationEmailAction(email)
      setResendMessage(res.message || 'Se o e-mail estiver cadastrado, um novo link foi enviado.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121315] flex flex-col items-center justify-center text-white p-4">
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg.png')", backgroundSize: 'cover', opacity: 0.2 }} />

      <div className="w-full max-w-md liquid-glass rounded-3xl p-8 border border-white/10 shadow-2xl relative z-10 text-center">
        {result.success ? (
          <div className="space-y-4">
            <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
            <h2 className="text-xl font-bold">E-mail confirmado!</h2>
            <p className="text-gray-400 text-sm">Sua conta foi ativada com sucesso. Faça login para continuar.</p>
            <a href="/login" className="block w-full bg-primary text-black font-bold py-3 rounded-xl">
              Ir para o Login
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="material-symbols-outlined text-5xl text-red-500">error</span>
            <h2 className="text-xl font-bold">Não foi possível confirmar</h2>
            <p className="text-gray-400 text-sm">{result.error}</p>

            {result.expired && (
              <div className="pt-4 space-y-3 text-left">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Seu e-mail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none text-white"
                />
                <button
                  onClick={handleResend}
                  disabled={sending || !email}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-60"
                >
                  {sending ? 'Enviando...' : 'Reenviar link de confirmação'}
                </button>
                {resendMessage && <p className="text-xs text-gray-400 text-center">{resendMessage}</p>}
              </div>
            )}

            {!result.expired && (
              <a href="/register-professor" className="block w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all">
                Voltar ao cadastro
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
