'use client'

import React, { useState } from 'react'
import { selectPlanAction } from './actions'

interface Plan {
  id: number
  key: string
  name: string
  credits: number | null
  priceInCents: number
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PLAN_HIGHLIGHT: Record<string, string> = {
  TURBO: 'RECOMENDADO',
}

export default function ChoosePlanClient({ plans, userName }: { plans: Plan[], userName?: string }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(planKey: string) {
    setError(null)
    setLoadingKey(planKey)
    try {
      const result = await selectPlanAction(planKey)
      if (result?.error) {
        setError(result.error)
        setLoadingKey(null)
      }
      // Em caso de sucesso, a action já faz o redirect — não há mais nada a fazer aqui.
    } catch (err) {
      setLoadingKey(null)
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-[#121315] flex flex-col items-center justify-center text-on-surface font-['Inter'] relative p-6">
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg.png')", backgroundSize: 'cover', opacity: 0.2 }} />

      <div className="text-center mb-12 relative z-10 max-w-xl">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
          {userName ? `Falta pouco, ${userName.split(' ')[0]}!` : 'Escolha seu plano'}
        </h1>
        <p className="text-gray-400">Selecione o plano que melhor se encaixa no seu volume de correções mensais.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 text-center max-w-md relative z-10">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full relative z-10">
        {plans.map((plan) => {
          const highlight = PLAN_HIGHLIGHT[plan.key];
          return (
            <div
              key={plan.id}
              className={`liquid-glass rounded-[2rem] p-8 border shadow-2xl flex flex-col relative ${highlight ? 'border-primary' : 'border-white/10'}`}
            >
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-black text-[10px] font-black uppercase rounded-full">
                  {highlight}
                </span>
              )}
              <h3 className="text-2xl font-black text-white mb-1">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{plan.credits} créditos por mês</p>

              <div className="mb-8">
                <span className="text-4xl font-black text-white">{formatPrice(plan.priceInCents)}</span>
                <span className="text-gray-500 text-sm">/mês</span>
              </div>

              <button
                onClick={() => handleSelect(plan.key)}
                disabled={loadingKey !== null}
                className={`mt-auto w-full py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 ${highlight ? 'bg-primary text-black hover:scale-[1.02]' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
              >
                {loadingKey === plan.key ? 'Processando...' : 'Assinar'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 mt-10 relative z-10 text-center max-w-md">
        Recebeu um código de convite VIP? Ele já teria liberado seu acesso gratuito automaticamente no cadastro.
      </p>
    </div>
  )
}
