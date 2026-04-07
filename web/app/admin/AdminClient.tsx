'use client'

import React from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';

function AdminMetricCard({ title, value, icon, subtitle }: { title: string, value: string, icon: string, subtitle?: string }) {
  return (
    <div className="col-span-12 lg:col-span-4 liquid-glass rounded-2xl p-8 relative overflow-hidden group shadow-2xl border border-primary">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary transition-all" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
          {subtitle && (
            <span className="px-2 py-0.5 bg-primary/5 text-primary text-caption rounded">{subtitle}</span>
          )}
        </div>
        <h3 className="text-gray-400 font-medium text-body-sm mb-1">{title}</h3>
        <p className="text-4xl font-bold tracking-tighter text-on-surface">{value}</p>
      </div>
    </div>
  );
}

export default function AdminClient({ initialUserName }: { initialUserName?: string }) {
  const { data: session, status } = useSession();
  
  const isLoadingSession = status === "loading";
  const currentUserName = initialUserName || session?.user?.name || (isLoadingSession ? "Carregando..." : "Usuário");

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      {/* BACKGROUND IMAGE AI-POWERED */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      
      <Sidebar role="ADMIN" />
      <TopBar userName={currentUserName} roleLabel="Administrador Global" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1700px] mx-auto space-y-10">
          
          {/* Hero Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-4xl font-bold tracking-tight text-on-surface">Painel de Controle Global</h2>
              <p className="text-on-surface-variant text-lg max-w-3xl leading-relaxed text-gray-400">
                Gerencie instituições, monitore o tráfego de usuários e audite a segurança de todo o ecossistema Profacher.
              </p>
            </div>
            <div className="flex items-end justify-end">
              <div className="w-full max-w-xs space-y-1 text-right text-gray-500 uppercase text-caption">
                <span>Status do Sistema</span>
                <div className="liquid-glass p-3 rounded-xl flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-bold text-body text-on-surface">Operacional</span>
                  </div>
                  <span className="text-caption text-gray-500/50">v2.0.5</span>
                </div>
              </div>
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="grid grid-cols-12 gap-8">
            <AdminMetricCard 
              title="Instituições Ativas" 
              value="1" 
              icon="account_balance" 
              subtitle="Expansão"
            />
            <AdminMetricCard 
              title="Usuários Totais" 
              value="3" 
              icon="group" 
              subtitle="Crescimento"
            />
            <AdminMetricCard 
              title="Queries de IA" 
              value="1.2k" 
              icon="auto_awesome" 
              subtitle="Atividade"
            />
          </section>

          {/* Global Construction Card */}
          <section className="liquid-glass p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6 shadow-2xl border border-primary min-h-[400px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center relative z-10 mb-2">
              <span className="material-symbols-outlined text-primary text-6xl animate-bounce-slow">construction</span>
            </div>
            
            <div className="relative z-10 space-y-4">
              <h4 className="text-3xl font-bold tracking-tight">Em Construção</h4>
              <p className="text-on-surface-variant text-lg max-w-xl mx-auto leading-relaxed text-gray-400">
                O módulo de gerenciamento de instituições está sendo migrado para a arquitetura Profacher High-Performance. 
                Em breve você poderá cadastrar e gerenciar cotas de IA diretamente por este painel.
              </p>
            </div>

            <div className="relative z-10 pt-4">
              <div className="flex gap-4">
                 <button className="btn-primary px-10">
                   Ver Documentação
                 </button>
                 <button className="btn-secondary px-10">
                   Relatar Bug
                 </button>
              </div>
            </div>

            {/* Micro Animations */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1 items-center opacity-30">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
