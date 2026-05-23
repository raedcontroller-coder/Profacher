'use client'

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import LogoProfacher from '../shared/LogoProfacher';
import { useSidebarStore } from '@/store/useSidebarStore';

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
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  let navItems = adminNavItems;
  if (role === 'COORDENADOR') navItems = coordinatorNavItems;
  if (role === 'PROFESSOR') navItems = professorNavItems;

  return (
    <aside className="fixed left-0 top-0 bottom-0 layout-sidebar bg-gray-50/80 dark:bg-[#121315]/80 backdrop-blur-xl border-r border-black/5 dark:border-outline-variant z-50 flex flex-col font-['Inter'] group/sidebar">
      <div className={`p-6 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} relative`}>
        <Link href={`/${role.toLowerCase()}`} className="flex items-center gap-3 group shrink-0">
          <LogoProfacher className="w-10 h-10 text-gray-900 dark:text-white transition-transform group-hover:scale-105 shrink-0" hoverBlink={true} />
          {!isCollapsed && (
            <div className="whitespace-nowrap transition-opacity duration-300">
              <h1 className="text-2xl font-black tracking-tighter text-on-surface">Prof<span className="text-primary">acher</span></h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role}</p>
            </div>
          )}
        </Link>
        <button 
          onClick={toggleSidebar}
          className={`absolute -right-3 top-8 bg-surface-container border border-outline-variant rounded-full w-6 h-6 flex items-center justify-center text-gray-500 hover:text-primary z-50 transition-transform ${isCollapsed ? 'rotate-180' : ''} opacity-0 group-hover/sidebar:opacity-100 shadow-md`}
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
      </div>

      <nav className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'px-4'} mt-12`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-xl opacity-40 cursor-not-allowed group relative`}
                title="Em breve"
              >
                <span className="material-symbols-outlined text-2xl text-gray-500 shrink-0">
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <div className="flex flex-col whitespace-nowrap">
                    <span className="font-bold text-body text-gray-500 leading-tight">{item.label}</span>
                    <span className="text-[10px] text-primary/70 font-bold uppercase tracking-wider mt-0.5">Em breve</span>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021]'
                }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`material-symbols-outlined text-2xl shrink-0 ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white'}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="font-bold text-body whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {(role === 'COORDENADOR' || role === 'PROFESSOR') && (
          <Link href={role === 'COORDENADOR' ? "/coordinator/new-exam" : "/professor/new-exam"} className={`mx-4 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary transition-all text-primary hover:text-black py-4 rounded-2xl border border-black/5 dark:border-white/[0.02] group shadow-lg ${isCollapsed ? 'px-0' : 'px-4'}`} title="Nova Prova">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform shrink-0">add_circle</span>
            {!isCollapsed && <span className="font-bold text-body whitespace-nowrap">Nova Prova</span>}
          </Link>
        )}

        <div className="border-t border-black/5 dark:border-outline-variant pt-4 px-2 space-y-1">
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-4 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021] transition-colors`}
            title="Sair"
          >
            <span className="material-symbols-outlined text-2xl shrink-0">logout</span>
            {!isCollapsed && <span className="font-bold text-body whitespace-nowrap">Sair</span>}
          </button>
        </div>

        <div className="px-4 py-4 opacity-30 hover:opacity-100 transition-opacity flex justify-center text-black dark:text-white">
          <img src={isCollapsed ? "/favicon.svg" : "/RaedLogo.svg"} alt="Raed" className="h-6 dark:brightness-0 dark:invert opacity-70 dark:opacity-100 object-contain" />
        </div>
      </div>
    </aside>
  );
}
