import React from 'react';
import { getProfessorProfileData } from './actions';
import { auth } from '@/auth';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata = {
  title: 'Configurações - Profacher',
};

export default async function ProfessorSettingsPage() {
  const session = await auth();
  const userName = session?.user?.name || "Professor";
  const result = await getProfessorProfileData();

  if (!result.success || !result.profile) {
    return (
      <div className="bg-[#121315] min-h-screen flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
          Erro ao carregar dados do perfil: {result.error}
        </div>
      </div>
    );
  }

  const { profile, institution, coordinator } = result;

  return (
    <div className="bg-background min-h-screen text-on-surface font-['Inter'] relative overflow-hidden transition-colors duration-300">
      {/* Background elements */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-0 dark:opacity-20"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 dark:bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="pl-64 pt-16 min-h-screen relative z-10 transition-all duration-500">
        <div className="p-12 max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Configurações de Perfil</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Visão geral da sua conta, instituição e coordenação.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Aparência do Sistema */}
            <div className="liquid-glass rounded-2xl p-6 relative overflow-hidden group md:col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-2xl">palette</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Aparência do Sistema</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Alterne entre o tema claro e escuro</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
        {/* Minhas Informações */}
        <div className="liquid-glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-primary">person</span>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-2xl">badge</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Minhas Informações</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Nome Completo</p>
              <p className="text-gray-900 dark:text-white text-lg font-medium">{profile.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Email / Acesso</p>
              <p className="text-gray-600 dark:text-gray-300">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Membro desde</p>
              <p className="text-gray-600 dark:text-gray-300">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(profile.createdAt))}</p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
                <span className="material-symbols-outlined text-sm">verified</span>
                Professor
              </span>
            </div>
          </div>
        </div>

        {/* Instituição */}
        <div className="liquid-glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-blue-500 dark:text-blue-400">account_balance</span>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-2xl">account_balance</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Instituição Atrelada</h2>
          </div>

          {institution ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Nome da Escola / Instituição</p>
                <p className="text-gray-900 dark:text-white text-lg font-medium">{institution.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Registro no Sistema</p>
                <p className="text-gray-600 dark:text-gray-300">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(institution.createdAt))}</p>
              </div>
              <div className="pt-4 p-4 mt-2 bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl">
                 <p className="text-sm text-gray-600 dark:text-gray-400 flex gap-2 items-start">
                   <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-base">info</span>
                   <span>A gestão de licenças e acesso aos recursos de IA são gerenciados por esta instituição.</span>
                 </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
               <span className="material-symbols-outlined text-gray-600 text-4xl">domain_disabled</span>
               <p className="text-gray-400 text-sm">Sua conta ainda não está vinculada a nenhuma instituição de ensino.</p>
            </div>
          )}
        </div>

        {/* Coordenador Responsável */}
        <div className="liquid-glass rounded-2xl p-6 relative overflow-hidden group md:col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-purple-500 dark:text-purple-400">admin_panel_settings</span>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-purple-500 dark:text-purple-400 text-2xl">admin_panel_settings</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Coordenação Responsável</h2>
          </div>

          {coordinator ? (
            <div className="flex items-center gap-6 p-4 bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl">
               <div className="w-16 h-16 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center border border-purple-500/20 dark:border-purple-500/30">
                 <span className="material-symbols-outlined text-3xl text-purple-600 dark:text-purple-400">supervisor_account</span>
               </div>
               <div>
                  <p className="text-gray-900 dark:text-white text-lg font-bold">{coordinator.fullName}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{coordinator.email}</p>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Coordenador Local
                  </span>
               </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
               <span className="material-symbols-outlined text-yellow-500">warning</span>
               <div>
                 <p className="text-yellow-400 font-bold mb-1">Nenhum coordenador atribuído</p>
                 <p className="text-yellow-500/70 text-sm">A instituição atual não possui um perfil de Coordenação ativo para suporte direto.</p>
               </div>
            </div>
          )}
        </div>

          </div>
        </div>
      </main>
    </div>
  );
}
