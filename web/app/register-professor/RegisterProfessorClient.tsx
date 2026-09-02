'use client'

import React, { useState } from 'react'
import { registerIndependentProfessorAction } from './actions'

export default function RegisterProfessorClient() {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSubmitting(true)
    try {
      const result = await registerIndependentProfessorAction(formData)
      if (result?.error) {
        setError(result.error)
      } else if (result?.pendingVerification) {
        setPendingVerificationEmail(result.email || null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-[#121315] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-primary/10 border border-primary/30 text-white p-6 rounded-xl max-w-md text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-primary">mark_email_unread</span>
          <h2 className="text-xl font-bold">Confirme seu e-mail</h2>
          <p className="text-gray-300 text-sm">
            Enviamos um link de confirmação para <strong>{pendingVerificationEmail}</strong>. Clique nele para ativar sua conta e poder fazer login.
          </p>
          <p className="text-gray-500 text-xs">Não recebeu? Verifique a caixa de spam ou tente confirmar novamente pela tela de login.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121315] flex flex-col items-center justify-center text-on-surface font-['Inter'] relative p-4">
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg.png')", backgroundSize: 'cover', opacity: 0.2 }} />
      <div className="w-full max-w-md liquid-glass rounded-3xl p-8 border border-white/10 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <img src="/RaedLogo.svg" alt="Raed Logo" className="h-8 mx-auto mb-6 brightness-0 invert" />
          <h1 className="text-2xl font-bold text-white mb-2">Professor Independente</h1>
          <p className="text-gray-400 text-sm">Crie sua conta individual no Profacher, sem precisar de uma instituição</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nome Completo</label>
            <input
              name="fullName"
              type="text"
              required
              placeholder="ex: João Silva"
              className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">E-mail</label>
            <input
              name="email"
              type="email"
              required
              placeholder="seuemail@exemplo.com"
              className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Crie sua Senha</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 pl-4 pr-12 focus:ring-2 focus:ring-primary/40 outline-none text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Confirme sua Senha</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 pl-4 pr-12 focus:ring-2 focus:ring-primary/40 outline-none text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-xl">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Código de Convite VIP (opcional)</label>
            <input
              name="vipCode"
              type="text"
              placeholder="Se você recebeu um código, insira aqui"
              className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none text-white uppercase placeholder:normal-case"
            />
            <p className="text-[11px] text-gray-500 mt-1 ml-1">Professores convidados com um código VIP têm acesso gratuito à plataforma.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
          >
            {submitting ? 'Criando conta...' : 'Criar Minha Conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
