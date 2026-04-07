'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getGlobalAiSettings, updateGlobalAiSettings } from './actions';
import { useSession } from 'next-auth/react';

const AI_MODELS = [
    { id: 'gpt-4o', name: 'OpenAI - GPT 4o' },
    { id: 'gpt-4-turbo', name: 'OpenAI - GPT 4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'OpenAI - GPT 3.5 Turbo' },
    { id: 'gemini-1.5-pro', name: 'Google - Gemini 1.5 Pro' },
    { id: 'claude-3-5-sonnet', name: 'Anthropic - Claude 3.5 Sonnet' },
    { id: 'deepseek-chat', name: 'Deepseek - V3' },
    { id: 'openrouter', name: 'OpenRouter (Multi-Model)' },
];

export default function AiSettingsPage() {
  const { data: session } = useSession();
  const [model, setModel] = useState('gpt-4o');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getGlobalAiSettings();
        if (settings) {
          setModel(settings.globalAiModel || 'gpt-4o');
          setApiKey(settings.globalAiKey || '');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateGlobalAiSettings({ globalAiModel: model, globalAiKey: apiKey });

    if (result.success) {
      setMessage({ type: 'success', text: 'Configurações de IA salva com sucesso!' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao salvar configurações.' });
    }
    setSaving(false);
  }

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      
      <Sidebar role="ADMIN" />
      <TopBar userName={session?.user?.name || "Administrador"} roleLabel="Administrador Global" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1200px] mx-auto space-y-10">
          
          <section className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-on-surface">Configuração de IA Geral</h2>
            <p className="text-on-surface-variant text-lg max-w-3xl leading-relaxed text-gray-400">
              Gerencie o motor de inteligência artificial que será compartilhado com as instituições no plano integrado.
            </p>
          </section>

          <section className="liquid-glass p-10 rounded-[2.5rem] border border-outline-variant shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <span className="animate-spin material-symbols-outlined text-4xl text-primary">sync</span>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando configurações...</p>
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-primary">model_training</span>
                                <label className="text-xs font-bold uppercase tracking-widest text-primary/70">Modelo de IA Mestre</label>
                            </div>
                            <div className="relative group">
                                <select 
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-5 outline-none focus:border-primary transition-all text-on-surface appearance-none cursor-pointer"
                                >
                                    {AI_MODELS.map(m => (
                                        <option key={m.id} value={m.id} className="bg-[#1a1c1e]">{m.name}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-primary">expand_more</span>
                            </div>
                            <p className="text-[10px] text-gray-500 ml-2 italic">Escolha o modelo principal para as instituições sem chave própria.</p>
                        </div>

                        <div className="space-y-4">
                             <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-primary">vpn_key</span>
                                <label className="text-xs font-bold uppercase tracking-widest text-primary/70">Chave de API Global</label>
                            </div>
                            <input 
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-5 outline-none focus:border-primary transition-all text-on-surface placeholder:text-gray-700"
                            />
                            <p className="text-[10px] text-gray-500 ml-2 italic">Esta chave será usada para o faturamento centralizado da plataforma.</p>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-primary/5 border border-white/5 flex items-start gap-4">
                        <span className="material-symbols-outlined text-primary mt-1">info</span>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-primary">Nota sobre Faturamento</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Todas as requisições feitas por instituições que utilizam a IA Geral serão descontadas desta chave. 
                                Certifique-se de que o saldo na plataforma do provedor (OpenAI, Gemini, etc.) esteja atualizado.
                            </p>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                            message.type === 'success' ? 'bg-green-500/5 border border-white/5 text-green-400' : 'bg-red-500/5 border border-white/5 text-red-400'
                        }`}>
                            <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}

                    <div className="pt-6 flex justify-end">
                        <button 
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-black font-bold px-12 py-5 rounded-[1.5rem] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-3 disabled:opacity-50"
                        >
                            {saving ? (
                                <span className="animate-spin material-symbols-outlined">sync</span>
                            ) : (
                                <span className="material-symbols-outlined font-bold">save</span>
                            )}
                            SALVAR CONFIGURAÇÃO MESTRE
                        </button>
                    </div>
                </form>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
