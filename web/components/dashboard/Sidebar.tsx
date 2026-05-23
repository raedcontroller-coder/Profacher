'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import LogoProfacher from '../shared/LogoProfacher';

interface NavItem {
  icon: string;
  label: string;
  href: string;
  disabled?: boolean;
}

const coordinatorNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', href: '/coordinator' },
  { icon: 'description', label: 'Provas', href: '/coordinator/exams' },
  { icon: 'analytics', label: 'Resultados', href: '/coordinator/results' },
  { icon: 'group', label: 'Gestão de Usuários', href: '/coordinator' },
  { icon: 'settings', label: 'Configurações', href: '/coordinator/settings' },
];

const adminNavItems: NavItem[] = [
  { icon: 'admin_panel_settings', label: 'Dashboard', href: '/admin' },
  { icon: 'account_balance', label: 'Instituições', href: '/admin/institutions' },
  { icon: 'smart_toy', label: 'IA Geral', href: '/admin/settings/ai' },
  { icon: 'group', label: 'Usuários Globais', href: '/admin/users' },
  { icon: 'security', label: 'Logs do Sistema', href: '/admin/logs' },
  { icon: 'settings', label: 'Configurações', href: '/admin/settings' },
];

const professorNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', href: '/professor' },
  { icon: 'description', label: 'Minhas provas', href: '/professor/exams' },
  { icon: 'inventory_2', label: 'Banco de Questões', href: '/professor/questions' },
  { icon: 'school', label: 'Minhas Classes', href: '/professor/classes', disabled: true },
  { icon: 'analytics', label: 'Desempenho', href: '/professor/analytics', disabled: true },
  { icon: 'settings', label: 'Configurações', href: '/professor/settings' },
];

interface SidebarProps {
  role: 'ADMIN' | 'COORDENADOR' | 'PROFESSOR';
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  
  let navItems = adminNavItems;
  if (role === 'COORDENADOR') navItems = coordinatorNavItems;
  if (role === 'PROFESSOR') navItems = professorNavItems;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-50/80 dark:bg-[#121315]/80 backdrop-blur-xl border-r border-black/5 dark:border-outline-variant z-50 flex flex-col font-['Inter']">
      <div className="p-8 pb-4">
        <Link href={`/${role.toLowerCase()}`} className="flex items-center gap-3 group">
          <LogoProfacher className="w-12 h-12 text-gray-900 dark:text-white transition-transform group-hover:scale-105" hoverBlink={true} />
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-on-surface">Prof<span className="text-primary">acher</span></h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl opacity-40 cursor-not-allowed group relative"
                title="Em breve"
              >
                <span className="material-symbols-outlined text-2xl text-gray-500">
                  {item.icon}
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-body text-gray-500 leading-tight">{item.label}</span>
                  <span className="text-[10px] text-primary/70 font-bold uppercase tracking-wider mt-0.5">Em breve</span>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021]'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="font-bold text-body">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {(role === 'COORDENADOR' || role === 'PROFESSOR') && (
          <Link href={role === 'COORDENADOR' ? "/coordinator/new-exam" : "/professor/new-exam"} className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary transition-all text-primary hover:text-black py-5 rounded-2xl border border-primary/20 group shadow-lg">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">add_circle</span>
            <span className="font-bold text-body">Nova Prova</span>
          </Link>
        )}
        
        <div className="border-t border-black/5 dark:border-outline-variant pt-4 px-2 space-y-1">
          <button 
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021] transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">logout</span>
            <span className="font-bold text-body">Sair</span>
          </button>
        </div>

        <div className="px-4 py-4 opacity-30 hover:opacity-100 transition-opacity flex justify-center text-black dark:text-white">
          <img src="/RaedLogo.svg" alt="Raed" className="h-6 dark:brightness-0 dark:invert opacity-70 dark:opacity-100" />
        </div>
      </div>
    </aside>
  );
}
