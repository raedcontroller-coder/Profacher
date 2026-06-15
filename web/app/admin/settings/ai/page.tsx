'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getGlobalAiSettings, updateGlobalAiSettings } from './actions';
import { useSession } from 'next-auth/react';

const AI_MODELS = [
    { id: 'gpt-4o', name: 'OpenAI - GPT 4o' },
    { id: 'gpt-4o-mini', name: 'OpenAI - GPT 4o Mini' },
    { id: 'gpt-4-turbo', name: 'OpenAI - GPT 4 Turbo' },
    { id: 'gemini-1.5-pro', name: 'Google - Gemini 1.5 Pro' },
    { id: 'claude-3-5-sonnet', name: 'Anthropic - Claude 3.5 Sonnet' },
    { id: 'deepseek-chat', name: 'Deepseek - V3' },
    { id: 'openrouter', name: 'OpenRouter (Multi-Model)' },
    { id: 'groq-llama-3.2-11b-vision-preview', name: 'Groq - Llama 3.2 11B Vision' },
    { id: 'groq-llama-3.2-90b-vision-preview', name: 'Groq - Llama 3.2 90B Vision' },
    { id: 'groq-llama-3.1-70b-versatile', name: 'Groq - Llama 3.1 70B Versatile' },
];

export default function AiSettingsPage() {
  const { data: session } = useSession();
  
  // Array de chaves: { id, label, model, key, active }
  const [savedKeys, setSavedKeys] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getGlobalAiSettings();
        if (settings) {
          if (settings.savedAiKeys && Array.isArray(settings.savedAiKeys) && settings.savedAiKeys.length > 0) {
            setSavedKeys(settings.savedAiKeys);
          } else {
            // Migrar a chave legada para o novo formato de array se existir
            if (settings.globalAiKey) {
                setSavedKeys([{
                    id: Date.now().toString(),
                    label: 'Chave Principal',
                    model: settings.globalAiModel || 'gpt-4o',
                    key: settings.globalAiKey,
                    active: true
                }]);
            } else {
                setSavedKeys([]); // Começa vazio
            }
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  function handleAddKey() {
      setSavedKeys([...savedKeys, {
          id: Date.now().toString(),
          label: 'Nova Chave',
          model: 'gpt-4o',
          key: '',
          active: savedKeys.length === 0, // a primeira vira ativa
          isFallback: false
      }]);
  }

  function handleRemoveKey(id: string) {
      const newKeys = savedKeys.filter(k => k.id !== id);
      // Se removeu a ativa, ativa a primeira que sobrar
      if (savedKeys.find(k => k.id === id)?.active && newKeys.length > 0) {
          newKeys[0].active = true;
      }
      setSavedKeys(newKeys);
  }

  function handleUpdateKey(id: string, field: string, value: any) {
      setSavedKeys(savedKeys.map(k => {
          if (k.id === id) {
              return { ...k, [field]: value };
          }
          return k;
      }));
  }

  function handleSetActive(id: string) {
      setSavedKeys(savedKeys.map(k => ({
          ...k,
          active: k.id === id,
          isFallback: k.id === id ? false : k.isFallback // Remove fallback se virou ativa
      })));
  }

  function handleSetFallback(id: string) {
      setSavedKeys(savedKeys.map(k => {
          if (k.id === id) {
              return { ...k, isFallback: !k.isFallback, active: false }; // Se vira fallback, não pode ser ativa
          }
          return { ...k, isFallback: false }; // Desmarca as outras
      }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateGlobalAiSettings({ savedAiKeys: savedKeys });

    if (result.success) {
      setMessage({ type: 'success', text: 'Cofre de chaves salvo com sucesso!' });
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

      <main className="layout-main pt-16 min-h-screen relative z-10">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-[1200px] mx-auto space-y-10">
          
          <section className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-on-surface">Cofre de IA Geral</h2>
            <p className="text-on-surface-variant text-lg max-w-3xl leading-relaxed text-gray-400">
              Gerencie suas chaves de API e alterne o motor de inteligência artificial ativo com facilidade.
            </p>
          </section>

          <section className="liquid-glass p-10 rounded-[2.5rem] border border-outline-variant shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <span className="animate-spin material-symbols-outlined text-4xl text-primary">sync</span>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando cofre...</p>
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-8">
                    
                    {/* Lista de Chaves */}
                    <div className="space-y-6">
                        {savedKeys.map((item, index) => (
                            <div 
                                key={item.id} 
                                className={`p-6 rounded-3xl border transition-all relative ${item.active ? 'bg-primary/5 border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]' : 'bg-[#0d0e0f]/50 border-outline-variant hover:border-outline-variant/80'}`}
                            >
                                {/* Botão Excluir */}
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveKey(item.id)}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors"
                                    title="Remover Chave"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    
                                    {/* Seleção de Status (Principal / Fallback) */}
                                    <div className="col-span-1 md:col-span-2 flex flex-col gap-3 justify-center items-center border-r border-outline-variant/30 pr-4">
                                        <button 
                                            type="button"
                                            onClick={() => handleSetActive(item.id)}
                                            className={`w-full py-1.5 px-3 rounded-lg border flex items-center gap-2 transition-all text-xs font-bold ${item.active ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border ${item.active ? 'border-primary bg-primary' : 'border-gray-500'}`} />
                                            Principal
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleSetFallback(item.id)}
                                            className={`w-full py-1.5 px-3 rounded-lg border flex items-center gap-2 transition-all text-xs font-bold ${item.isFallback ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-outline-variant text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border ${item.isFallback ? 'border-orange-500 bg-orange-500' : 'border-gray-500'}`} />
                                            Fallback
                                        </button>
                                    </div>

                                    {/* Campos */}
                                    <div className="col-span-11 md:col-span-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Identificador (Opcional)</label>
                                            <input 
                                                type="text"
                                                value={item.label}
                                                onChange={(e) => handleUpdateKey(item.id, 'label', e.target.value)}
                                                placeholder="Ex: Minha conta OpenRouter"
                                                className="w-full bg-[#1a1c1e] border border-outline-variant rounded-xl p-4 outline-none focus:border-primary transition-all text-sm text-on-surface"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Motor / Provedor</label>
                                            <div className="relative group">
                                                <select 
                                                    value={item.model}
                                                    onChange={(e) => handleUpdateKey(item.id, 'model', e.target.value)}
                                                    className="w-full bg-[#1a1c1e] border border-outline-variant rounded-xl p-4 pr-10 outline-none focus:border-primary transition-all text-sm text-on-surface cursor-pointer"
                                                >
                                                    {AI_MODELS.map(m => (
                                                        <option key={m.id} value={m.id} className="bg-[#1a1c1e]">{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Chave de API (Secret)</label>
                                            <input 
                                                type="password"
                                                value={item.key}
                                                onChange={(e) => handleUpdateKey(item.id, 'key', e.target.value)}
                                                placeholder="sk-..."
                                                className="w-full bg-[#1a1c1e] border border-outline-variant rounded-xl p-4 outline-none focus:border-primary transition-all text-sm text-on-surface placeholder:text-gray-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {savedKeys.length === 0 && (
                            <div className="text-center py-10 bg-[#0d0e0f]/30 border border-outline-variant rounded-3xl border-dashed">
                                <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">key_off</span>
                                <p className="text-gray-400">Nenhuma chave cadastrada no cofre.</p>
                            </div>
                        )}
                    </div>

                    <button 
                        type="button"
                        onClick={handleAddKey}
                        className="flex items-center gap-2 text-primary font-bold hover:brightness-125 transition-all text-sm bg-primary/10 px-6 py-3 rounded-xl border border-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Adicionar Nova Chave
                    </button>

                    <div className="p-6 rounded-2xl bg-primary/5 border border-outline-variant flex items-start gap-4">
                        <span className="material-symbols-outlined text-primary mt-1">info</span>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-primary">Nota sobre Redundância (Fallback)</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                A chave <strong>Principal</strong> será usada para todas as correções. Caso o provedor principal sofra uma queda ou falha, o sistema utilizará automaticamente a chave marcada como <strong>Fallback</strong> para garantir que a correção da prova não seja perdida.
                            </p>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                            message.type === 'success' ? 'bg-green-500/5 border border-outline-variant text-green-400' : 'bg-red-500/5 border border-outline-variant text-red-400'
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
                            SALVAR COFRE E ATIVAR
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
