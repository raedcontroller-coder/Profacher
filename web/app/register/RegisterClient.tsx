'use client'

import React, { useState, useEffect } from 'react'
import { validateTokenAction, registerUserAction } from './actions'
import { useRouter } from 'next/navigation'

export default function RegisterClient({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function validate() {
      const result = await validateTokenAction(token)
      if (result.error) {
        setError(result.error)
      } else if (result.email) {
        setEmail(result.email)
      }
      setLoading(false)
    }
    validate()
  }, [token])

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await registerUserAction(formData)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#121315] flex items-center justify-center text-white">Carregando convite...</div>
  }

  if (error && !email) {
    return (
      <div className="min-h-screen bg-[#121315] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-6 rounded-xl max-w-md text-center">
          <span className="material-symbols-outlined text-4xl mb-4">error</span>
          <h2 className="text-xl font-bold mb-2">Convite Inválido</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#121315] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-green-500/10 border border-green-500 text-green-500 p-6 rounded-xl max-w-md text-center">
          <span className="material-symbols-outlined text-4xl mb-4">check_circle</span>
          <h2 className="text-xl font-bold mb-2">Conta Criada!</h2>
          <p>Você será redirecionado para o login em instantes...</p>
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
          <h1 className="text-2xl font-bold text-white mb-2">Aceitar Convite</h1>
          <p className="text-gray-400 text-sm">Crie sua conta para acessar o Profacher</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">E-mail</label>
            <input 
              type="email" 
              value={email} 
              disabled 
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
            />
          </div>

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
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Crie sua Senha</label>
            <input 
              name="password"
              type="password" 
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none text-white"
            />
          </div>

          <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.02]">
            Criar Minha Conta
          </button>
        </form>
      </div>
    </div>
  )
}
