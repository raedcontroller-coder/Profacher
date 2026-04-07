'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getInstitutions, getInstitutionUsers, createInstitution, updateInstitution, deleteInstitution } from './actions';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: { name: string };
  createdAt: Date | string;
}

interface Institution {
  id: number;
  name: string;
  slug: string;
  hasIntegratedAi: boolean;
  customAiModel?: string | null;
  customAiKey?: string | null;
  _count: { users: number };
}

function InstitutionUsersList({ institutionId }: { institutionId: number }) {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  async function loadUsers(targetPage: number) {
    setLoading(true);
    try {
      const data = await getInstitutionUsers(institutionId, targetPage);
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setPage(data.currentPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(1);
  }, [institutionId]);

  return (
    <div className="mt-6 border-t border-outline-variant pt-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
          <h4 className="text-body font-bold text-primary/70">Membros da Instituição</h4>
        <div className="flex items-center gap-2">
          <button 
            disabled={page === 1 || loading}
            onClick={() => loadUsers(page - 1)}
            className="p-1 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <span className="text-body-sm font-mono text-gray-500 tracking-widest">Página {page} / {totalPages}</span>
          <button 
            disabled={page === totalPages || loading}
            onClick={() => loadUsers(page + 1)}
            className="p-1 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4"><span className="animate-spin material-symbols-outlined text-primary">sync</span></div>
        ) : users.length > 0 ? (
          users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0d0e0f]/50 border border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center text-body font-bold text-primary border border-white/5">
                   {user.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-subtitle text-on-surface">{user.fullName}</p>
                  <p className="text-body text-gray-500">{user.email}</p>
                </div>
              </div>
              <span className="text-body font-bold text-gray-600 bg-white/5 px-3 py-1 rounded border border-white/5">
                {user.role.name}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-600 italic">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}

function InstitutionCard({ institution, onEdit, onDelete }: { institution: Institution, onEdit: (inst: Institution) => void, onDelete: (inst: Institution) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`liquid-glass rounded-[2rem] p-8 border border-outline-variant shadow-2xl transition-all duration-500 ${isExpanded ? 'ring-2 ring-primary' : 'hover:border-primary'}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/5 flex items-center justify-center border border-primary shadow-inner group">
             <span className="material-symbols-outlined text-3xl text-primary transition-transform group-hover:scale-110">account_balance</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-on-surface">{institution.name}</h3>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">slug: {institution.slug}</span>
               <div className="h-1 w-1 bg-gray-500 rounded-full opacity-30" />
               <span className="text-xs font-bold text-primary/70 uppercase tracking-widest">{institution._count.users} Usuários Totais</span>
               <div className="h-1 w-1 bg-gray-500 rounded-full opacity-30" />
               {institution.hasIntegratedAi ? (
                 <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded border border-white/5 flex items-center gap-1">
                   <span className="material-symbols-outlined text-[12px]">verified</span>
                   IA INTEGRADA
                 </span>
               ) : (
                 <span className="px-2 py-0.5 bg-amber-500/5 text-amber-500 text-[10px] font-bold rounded border border-white/5 flex items-center gap-1">
                   <span className="material-symbols-outlined text-[12px]">key</span>
                   IA PRÓPRIA
                 </span>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(institution);
                }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all text-gray-400 group"
            >
                <span className="material-symbols-outlined transition-transform group-hover:scale-110">edit</span>
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(institution);
                }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all text-gray-400 group"
            >
                <span className="material-symbols-outlined transition-transform group-hover:scale-110">delete</span>
            </button>
            <button className={`p-3 rounded-2xl bg-surface-container-highest/20 transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : 'text-gray-400'}`}>
                <span className="material-symbols-outlined">expand_more</span>
            </button>
        </div>
      </div>

      {isExpanded && <InstitutionUsersList institutionId={institution.id} />}
    </div>
  );
}

function EditInstitutionModal({ isOpen, onClose, onSuccess, institution }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, institution: Institution | null }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasIntegratedAi, setHasIntegratedAi] = useState(false);
  const [customAiModel, setCustomAiModel] = useState('gpt-4o');
  const [customAiKey, setCustomAiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (institution) {
      setName(institution.name);
      setSlug(institution.slug);
      setApiKey(''); 
      setHasIntegratedAi(institution.hasIntegratedAi);
      setCustomAiModel(institution.customAiModel || 'gpt-4o');
      setCustomAiKey(''); // Nunca mostrar a chave atual por segurança
      setConfirming(false);
    }
  }, [institution]);

  if (!isOpen || !institution) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirming) {
        setConfirming(true);
        return;
    }

    setLoading(true);
    setError(null);

    const result = await updateInstitution(institution!.id, { 
      name, 
      slug, 
      apiKeyOpenai: apiKey,
      hasIntegratedAi,
      customAiModel,
      customAiKey
    });

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erro desconhecido");
      setConfirming(false);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="liquid-glass w-full max-w-xl p-10 rounded-[2.5rem] border border-outline-variant shadow-2xl relative animate-in zoom-in-95 duration-500">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-on-surface">Editar Instituição</h2>
            <p className="text-gray-500 mt-2">Atualize as informações da organização.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">Nome da Instituição</label>
            <input 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-primary text-on-surface"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">Slug</label>
            <input 
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-'))}
              className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-primary text-on-surface"
            />
          </div>

          <div className="space-y-4 p-6 rounded-3xl bg-primary/5 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Plano com IA Integrada
                </label>
                <p className="text-[10px] text-gray-500 italic">Usa o motor de IA central do Profacher.</p>
              </div>
              <button 
                type="button"
                onClick={() => setHasIntegratedAi(!hasIntegratedAi)}
                className={`w-14 h-7 rounded-full transition-all relative ${hasIntegratedAi ? 'bg-primary' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${hasIntegratedAi ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            {!hasIntegratedAi && (
              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Modelo de IA da Instituição</label>
                  <select 
                    value={customAiModel}
                    onChange={(e) => setCustomAiModel(e.target.value)}
                    className="w-full bg-black/40 border border-outline-variant rounded-xl p-3 outline-none text-sm text-on-surface"
                  >
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="deepseek-chat">Deepseek V3</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">API Key Própria</label>
                  <input 
                    type="password"
                    value={customAiKey}
                    onChange={(e) => setCustomAiKey(e.target.value)}
                    placeholder="Mantenha vazio para não alterar"
                    className="w-full bg-black/40 border border-outline-variant rounded-xl p-3 outline-none text-sm text-on-surface"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <div className="p-4 rounded-xl bg-red-500/5 border border-white/5 text-red-500 text-sm">{error}</div>}

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={() => confirming ? setConfirming(false) : onClose()} className="flex-1 p-4 rounded-2xl border border-outline-variant hover:bg-white/5 font-bold">
              {confirming ? "Voltar" : "Cancelar"}
            </button>
            <button 
              type="submit"
              disabled={loading}
              className={`flex-2 font-bold p-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${confirming ? 'bg-amber-500 text-black' : 'bg-primary text-on-primary'}`}
            >
              {loading ? <span className="animate-spin material-symbols-outlined">sync</span> : (
                  <>
                    <span className="material-symbols-outlined">{confirming ? 'done_all' : 'save'}</span>
                    {confirming ? "Tenho certeza, Salvar" : "Salvar Alterações"}
                  </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteInstitutionModal({ isOpen, onClose, onSuccess, institution }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, institution: Institution | null }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !institution) return null;

  async function handleDelete() {
    if (confirmName !== institution.name) return;
    
    setLoading(true);
    setError(null);
    const result = await deleteInstitution(institution!.id);
    if (result.success) {
      onSuccess();
      onClose();
      setConfirmName('');
    } else {
      setError(result.error || "Erro ao excluir");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="liquid-glass w-full max-w-xl p-10 rounded-[2.5rem] border border-red-500/30 shadow-2xl relative animate-in zoom-in-95 duration-500">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-red-500">Excluir Instituição</h2>
            <p className="text-gray-500 mt-2 italic">Esta ação é permanente e removerá todos os vínculos.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-red-500/5 border border-white/5 text-on-surface leading-relaxed">
            Para confirmar a exclusão, digite o nome exato da instituição abaixo:
            <br />
            <strong className="text-red-400 select-none">{institution.name}</strong>
          </div>

          <input 
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Digite o nome aqui..."
            className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-red-500 transition-all text-on-surface"
          />

          {error && <div className="p-4 rounded-xl bg-red-500/5 border border-white/5 text-red-500 text-sm">{error}</div>}

          <div className="pt-4 flex gap-4">
            <button onClick={onClose} className="flex-1 p-4 rounded-2xl border border-outline-variant hover:bg-white/5 font-bold transition-all">
              Cancelar
            </button>
            <button 
              disabled={confirmName !== institution.name || loading}
              onClick={handleDelete}
              className="flex-2 bg-red-500 text-white font-bold p-4 rounded-2xl hover:bg-red-600 disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              {loading ? <span className="animate-spin material-symbols-outlined text-xl">sync</span> : (
                <>
                  <span className="material-symbols-outlined text-xl">delete_forever</span>
                  Confirmar Exclusão
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterInstitutionModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasIntegratedAi, setHasIntegratedAi] = useState(false);
  const [customAiModel, setCustomAiModel] = useState('gpt-4o');
  const [customAiKey, setCustomAiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createInstitution({ 
      name, 
      slug, 
      apiKeyOpenai: apiKey,
      hasIntegratedAi,
      customAiModel,
      customAiKey
    });

    if (result.success) {
      onSuccess();
      onClose();
      // Reset form
      setName('');
      setSlug('');
      setApiKey('');
    } else {
      setError(result.error || "Erro desconhecido");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="liquid-glass w-full max-w-xl p-10 rounded-[2.5rem] border border-outline-variant shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-on-surface">Nova Instituição</h2>
            <p className="text-gray-500 mt-2">Preencha os dados básicos da nova organização.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">Nome da Instituição</label>
            <input 
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Sugestão automática de slug
                if (!slug || slug === name.toLowerCase().trim().replace(/\s+/g, '-')) {
                    setSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-'));
                }
              }}
              placeholder="Ex: Universidade Profacher"
              className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary/70 ml-1">Slug (Identificador Único)</label>
            <div className="relative">
                <input 
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim().replace(/\s+/g, '-'))}
                placeholder="ex-universidade-profacher"
                className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface pl-4"
                />
            </div>
            <p className="text-[10px] text-gray-500 ml-1 italic">Este será usado na URL e deve ser único.</p>
          </div>

          <div className="space-y-4 p-6 rounded-3xl bg-primary/5 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Plano com IA Integrada
                </label>
                <p className="text-[10px] text-gray-500 italic">Usa o motor de IA central do Profacher.</p>
              </div>
              <button 
                type="button"
                onClick={() => setHasIntegratedAi(!hasIntegratedAi)}
                className={`w-14 h-7 rounded-full transition-all relative ${hasIntegratedAi ? 'bg-primary' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${hasIntegratedAi ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            {!hasIntegratedAi && (
              <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Modelo de IA da Instituição</label>
                  <select 
                    value={customAiModel}
                    onChange={(e) => setCustomAiModel(e.target.value)}
                    className="w-full bg-black/40 border border-outline-variant rounded-xl p-3 outline-none text-sm text-on-surface"
                  >
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="deepseek-chat">Deepseek V3</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">API Key Própria</label>
                  <input 
                    type="password"
                    value={customAiKey}
                    onChange={(e) => setCustomAiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-black/40 border border-outline-variant rounded-xl p-3 outline-none text-sm text-on-surface"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-white/5 text-red-500 text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 p-4 rounded-2xl border border-outline-variant hover:bg-white/5 font-bold transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-2 bg-primary text-on-primary font-bold p-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-xl">sync</span>
                  Salvando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">add_business</span>
                  Confirmar Cadastro
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InstitutionsClient({ initialUserName }: { initialUserName?: string }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getInstitutions();
      setInstitutions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      {/* Background with higher opacity for listing pages */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      
      <Sidebar role="ADMIN" />
      <TopBar userName={initialUserName || "Administrador"} roleLabel="Administrador Global" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1700px] mx-auto space-y-10">
          
          <section className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className="text-4xl font-bold tracking-tight text-on-surface">Diretório Institucional</h2>
              <p className="text-on-surface-variant text-lg max-w-3xl leading-relaxed text-gray-400">
                Visualize e gerencie as organizações e seus respectivos membros cadastrados na plataforma.
              </p>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-on-primary px-8 py-4 rounded-[1.5rem] font-bold flex items-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
               <span className="material-symbols-outlined font-bold">add</span>
               CADASTRAR NOVA INSTITUIÇÃO
            </button>
          </section>

          <RegisterInstitutionModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={loadData}
          />

          <EditInstitutionModal 
            isOpen={!!editingInstitution} 
            onClose={() => setEditingInstitution(null)} 
            onSuccess={loadData} 
            institution={editingInstitution} 
          />

          <DeleteInstitutionModal 
            isOpen={!!deletingInstitution} 
            onClose={() => setDeletingInstitution(null)} 
            onSuccess={loadData} 
            institution={deletingInstitution} 
          />

          <section className="space-y-8">
            {loading ? (
              <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
            ) : institutions.length > 0 ? (
              institutions.map(inst => (
                <InstitutionCard 
                    key={inst.id} 
                    institution={inst} 
                    onEdit={setEditingInstitution}
                    onDelete={setDeletingInstitution}
                />
              ))
            ) : (
              <div className="liquid-glass p-20 rounded-3xl text-center flex flex-col items-center gap-4">
                 <span className="material-symbols-outlined text-6xl opacity-20">search_off</span>
                 <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Nenhuma instituição ativa no banco.</p>
              </div>
            )}
          </section>
          
        </div>
      </main>
    </div>
  );
}
