'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getQuestionGroups, createQuestionGroup, deleteQuestionGroup } from './actions';

interface QuestionGroup {
  id: number;
  name: string;
  description: string | null;
  _count: { questions: number };
}

export default function QuestionsClient({ userName }: { userName: string }) {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await getQuestionGroups();
      setGroups(data);
    } catch (e) {
      console.error("Erro ao carregar grupos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    const res = await createQuestionGroup({ name: newName, description: newDesc });
    if (res.success) {
      await loadGroups();
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
    }
    setIsCreating(false);
  }

  async function handleDelete(id: number) {
    if (confirm("Deseja realmente excluir este grupo? As questões associadas permanecerão no banco, mas perderão a categoria.")) {
      const res = await deleteQuestionGroup(id);
      if (res.success) {
        await loadGroups();
      }
    }
  }

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      {/* Background decoration */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center" 
        style={{ backgroundImage: "url('/bg.png')" }} 
      />
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1700px] mx-auto space-y-12">
          
          <header className="flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-4">
               <h2 className="text-5xl font-bold tracking-tight text-on-surface">Banco de <span className="text-primary">Questões</span></h2>
               <p className="text-gray-400 text-xl max-w-2xl leading-relaxed">
                  Gerencie o seu repositório de conteúdos e categorias para avaliações.
               </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-black font-bold px-10 py-5 rounded-[2rem] flex items-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 group"
            >
               <span className="material-symbols-outlined font-bold group-hover:rotate-90 transition-transform">add_box</span>
               CRIAR NOVO GRUPO
            </button>
          </header>

          <section className={loading ? "flex justify-center py-32" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in zoom-in-95 duration-1000"}>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                 <span className="animate-spin material-symbols-outlined text-5xl text-primary">sync</span>
                 <p className="text-xs font-mono uppercase tracking-widest text-primary animate-pulse">Carregando acervo...</p>
              </div>
            ) : groups.length > 0 ? (
               groups.map((group, idx) => (
                 <div 
                   key={group.id} 
                   className="liquid-glass p-8 rounded-[3rem] border border-outline-variant hover:border-primary/50 transition-all group relative overflow-hidden flex flex-col h-full"
                   style={{ animationDelay: `${idx * 100}ms` }}
                 >
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => handleDelete(group.id)}
                         className="p-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all"
                         title="Excluir Grupo"
                       >
                          <span className="material-symbols-outlined text-xl">delete</span>
                       </button>
                    </div>
                    
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary mb-8 border border-primary/20 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                       <h3 className="text-2xl font-bold text-on-surface truncate group-hover:text-primary transition-colors">{group.name}</h3>
                       <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed min-h-[60px] italic">
                          {group.description || 'Nenhuma descrição detalhada disponível para este grupo.'}
                       </p>
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-outline-variant flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Conteúdo</span>
                          <span className="text-lg font-bold text-primary">{group._count.questions} <span className="text-xs text-gray-500">itens</span></span>
                       </div>
                       <button className="bg-white/5 p-4 rounded-2xl hover:bg-primary transition-all hover:text-black group/btn">
                          <span className="material-symbols-outlined text-xl group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                       </button>
                    </div>
                 </div>
               ))
            ) : (
               <div className="col-span-full py-40 liquid-glass rounded-[4rem] flex flex-col items-center justify-center text-center gap-6 border border-dashed border-outline-variant opacity-60">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                     <span className="material-symbols-outlined text-6xl text-primary/30">inventory_2</span>
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-2xl font-bold tracking-tight">Acervo Vazio</h4>
                     <p className="text-gray-500 max-w-xs mx-auto">Você ainda não organizou suas questões em grupos temáticos.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-primary font-bold uppercase tracking-widest text-xs hover:underline decoration-primary/30 underline-offset-8"
                  >
                     Criar primeiro grupo agora
                  </button>
               </div>
            )}
          </section>

          {/* Modal de Criação */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
               <div className="liquid-glass w-full max-w-xl p-12 rounded-[3.5rem] border border-outline-variant relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                  
                  <div className="flex justify-between items-start mb-10">
                     <div>
                        <h3 className="text-3xl font-bold tracking-tight">Novo Grupo</h3>
                        <p className="text-gray-500 mt-2">Crie uma categoria para organizar suas questões.</p>
                     </div>
                     <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined">close</span>
                     </button>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-8">
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary ml-1">Título do Grupo</label>
                        <input 
                          required 
                          disabled={isCreating}
                          value={newName} 
                          onChange={e => setNewName(e.target.value)}
                          placeholder="Ex: Física - Leis de Newton"
                          className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary ml-1">Observações (Opcional)</label>
                        <textarea 
                          disabled={isCreating}
                          value={newDesc} 
                          onChange={e => setNewDesc(e.target.value)}
                          placeholder="Descreva o que este grupo abrange..."
                          className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface h-32 resize-none"
                        />
                     </div>
                     
                     <div className="flex gap-4 pt-4">
                        <button 
                          type="button" 
                          disabled={isCreating}
                          onClick={() => setIsModalOpen(false)} 
                          className="flex-1 p-5 rounded-2xl font-bold hover:bg-white/5 border border-transparent hover:border-outline-variant transition-all"
                        >
                           Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={isCreating}
                          className="flex-[2] bg-primary text-black font-bold p-5 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                           {isCreating ? (
                              <span className="animate-spin material-symbols-outlined">sync</span>
                           ) : (
                              <>
                                 <span className="material-symbols-outlined">save</span>
                                 Confirmar e Salvar
                              </>
                           )}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
