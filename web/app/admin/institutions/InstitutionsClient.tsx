'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getInstitutions, getInstitutionUsers } from './actions';

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
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-body font-bold text-primary border border-primary">
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

function InstitutionCard({ institution }: { institution: Institution }) {
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
            </div>
          </div>
        </div>
        <button className={`p-3 rounded-2xl bg-surface-container-highest/20 transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : 'text-gray-400'}`}>
           <span className="material-symbols-outlined">expand_more</span>
        </button>
      </div>

      {isExpanded && <InstitutionUsersList institutionId={institution.id} />}
    </div>
  );
}

export default function InstitutionsClient({ initialUserName }: { initialUserName?: string }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getInstitutions();
        setInstitutions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
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
          </section>

          <section className="space-y-8">
            {loading ? (
              <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
            ) : institutions.length > 0 ? (
              institutions.map(inst => (
                <InstitutionCard key={inst.id} institution={inst} />
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
