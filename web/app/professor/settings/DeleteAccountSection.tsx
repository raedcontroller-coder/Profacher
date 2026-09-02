'use client'

import React, { useState } from 'react'
import { signOut } from 'next-auth/react'
import { deleteMyAccountAction } from './actions'

export default function DeleteAccountSection({ email }: { email: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function closeModal() {
    setIsModalOpen(false)
    setConfirmEmail('')
    setUnderstood(false)
    setError(null)
  }

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteMyAccountAction(confirmEmail)
    if (result.success) {
      await signOut({ callbackUrl: '/login' })
    } else {
      setError(result.error || 'Erro ao excluir a conta.')
      setLoading(false)
    }
  }

  const canDelete = understood && confirmEmail.trim().toLowerCase() === email.toLowerCase() && !loading

  return (
    <>
      <div className="liquid-glass rounded-2xl p-6 relative overflow-hidden group md:col-span-2 border border-red-500/20">
        <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
          <span className="material-symbols-outlined text-6xl text-red-500">warning</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-red-500 text-2xl">delete_forever</span>
          <h2 className="text-xl font-bold text-red-500">Zona de Perigo</h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-2xl">
          Encerre sua conta caso não queira mais usar o Profacher. Esta ação apaga permanentemente sua conta, assinatura,
          provas, questões e correções — não é possível desfazer.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">delete_forever</span>
          Excluir Minha Conta
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="liquid-glass w-full max-w-xl p-10 rounded-[2.5rem] border border-red-500/30 shadow-2xl relative animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-red-500">Excluir Minha Conta</h2>
                <p className="text-gray-500 mt-2 italic">Esta ação é permanente e não pode ser desfeita.</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-on-surface leading-relaxed text-sm">
                Ao excluir sua conta, você perderá <strong>permanentemente</strong>:
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                  <li>Todas as suas provas e questões cadastradas</li>
                  <li>Todas as correções e resultados de alunos</li>
                  <li>Sua assinatura e créditos restantes</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-outline-variant"
                />
                <span className="text-sm text-gray-300">Eu entendo que essa ação é irreversível e todos os meus dados serão perdidos.</span>
              </label>

              <div>
                <p className="text-on-surface mb-2">
                  Para confirmar, digite seu e-mail (<strong className="text-red-400 select-none">{email}</strong>) abaixo:
                </p>
                <input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Digite seu e-mail aqui..."
                  className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-red-500 transition-all text-on-surface"
                />
              </div>

              {error && <div className="p-4 rounded-xl bg-red-500/5 border border-outline-variant text-red-500 text-sm">{error}</div>}

              <div className="pt-4 flex gap-4">
                <button onClick={closeModal} className="flex-1 p-4 rounded-2xl border border-outline-variant hover:bg-white/5 font-bold transition-all">
                  Cancelar
                </button>
                <button
                  disabled={!canDelete}
                  onClick={handleDelete}
                  className="flex-[2] bg-red-500 text-white font-bold p-4 rounded-2xl hover:bg-red-600 disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
