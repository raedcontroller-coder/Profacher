'use client'

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getProfessorStats } from './actions';

interface TeacherStats {
  totalGroups: number;
  totalQuestions: number;
  lastActivity: Date;
}

export default function ProfessorClient({ userName }: { userName: string }) {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getProfessorStats();
        setStats(data);
      } catch (e) {
        console.error("Erro ao carregar estatísticas:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      {/* Background elements */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="pl-64 pt-16 min-h-screen relative z-10 transition-all duration-500">
        <div className="p-12 max-w-[1600px] mx-auto space-y-12">
          
          <header className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <h2 className="text-5xl font-bold tracking-tight text-on-surface">Minha <span className="text-primary">Área Escolar</span></h2>
            <p className="text-on-surface-variant text-xl max-w-2xl leading-relaxed text-gray-400">
              Bem-vindo, {userName}. Aqui você gerencia suas turmas, banco de questões e cria novas avaliações assistidas por IA.
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-1000 delay-200">
             {/* Card 1: Grupos */}
             <div className="liquid-glass p-8 rounded-[2.5rem] border border-outline-variant hover:border-primary/50 transition-all group">
                <div className="flex items-start justify-between mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">category</span>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-mono uppercase tracking-widest text-gray-500">Meus Grupos</p>
                      <h4 className="text-3xl font-bold text-on-surface">{loading ? '...' : stats?.totalGroups}</h4>
                   </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">Categorias organizadas para suas provas.</p>
             </div>

             {/* Card 2: Questões */}
             <div className="liquid-glass p-8 rounded-[2.5rem] border border-outline-variant hover:border-secondary/50 transition-all group">
                <div className="flex items-start justify-between mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-3xl">quiz</span>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-mono uppercase tracking-widest text-gray-500">Total de Questões</p>
                      <h4 className="text-3xl font-bold text-on-surface">{loading ? '...' : stats?.totalQuestions}</h4>
                   </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed italic">Itens autorais cadastrados no banco.</p>
             </div>

             {/* Card 3: Acesso Rápido */}
             <div className="liquid-glass p-8 rounded-[2.5rem] border border-outline-variant bg-primary/5 border-primary/20 flex flex-col justify-center items-center text-center gap-4 group cursor-pointer hover:bg-primary/10 transition-all">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-3xl font-bold">add</span>
                </div>
                <div>
                   <h4 className="font-bold text-lg text-on-surface">Criar Nova Prova</h4>
                   <p className="text-xs text-primary font-bold uppercase tracking-widest">Inicie agora</p>
                </div>
             </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="liquid-glass p-10 rounded-[3rem] border border-outline-variant space-y-6">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">history</span>
                      Atividade Recente
                  </h3>
                  <div className="space-y-4">
                      {/* Placeholders for activity */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 opacity-50">
                          <div className="w-10 h-10 rounded-full bg-gray-700" />
                          <div className="flex-1 space-y-1">
                              <div className="h-4 w-32 bg-gray-700 rounded" />
                              <div className="h-3 w-48 bg-gray-800 rounded" />
                          </div>
                      </div>
                      <p className="text-center text-sm text-gray-600 py-4 font-mono uppercase tracking-widest">As atividades aparecerão aqui à medida que você criar conteúdos.</p>
                  </div>
              </div>

              <div className="liquid-glass p-10 rounded-[3rem] border border-outline-variant space-y-6 bg-gradient-to-br from-transparent to-primary/5">
                  <h3 className="text-2xl font-bold flex items-center gap-3 text-primary">
                      <span className="material-symbols-outlined">auto_awesome</span>
                      Assistente de IA
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                      Sua conta está integrada com o GPT-4o para auxiliar na criação de questões e correção de textos. Use o menu ao lado para acessar o banco inteligente.
                  </p>
                  <button className="w-full py-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center gap-3 hover:bg-primary hover:text-black transition-all">
                      <span className="material-symbols-outlined">explore</span>
                      Explorar banco inteligente
                  </button>
              </div>
          </section>

        </div>
      </main>
    </div>
  );
}
