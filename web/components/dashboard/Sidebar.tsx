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
  { icon: 'analytics', label: 'Resultados', href: '/coordinator/results' },
  { icon: 'group', label: 'Gestão de Usuários', href: '/coordinator/users' },
  { icon: 'monitoring', label: 'Custos de IA', href: '/coordinator/ai-costs' },
  { icon: 'settings', label: 'Configurações', href: '/coordinator/settings' },
];

const adminNavItems: NavItem[] = [
  { icon: 'admin_panel_settings', label: 'Dashboard', href: '/admin' },
  { icon: 'account_balance', label: 'Instituições', href: '/admin/institutions' },
  { icon: 'smart_toy', label: 'IA Geral', href: '/admin/settings/ai' },
  { icon: 'group', label: 'Usuários Globais', href: '/admin/users', disabled: true },
  { icon: 'security', label: 'Logs do Sistema', href: '/admin/logs', disabled: true },
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
  const { isCollapsed, toggleSidebar, mobileOpen, setMobileOpen } = useSidebarStore();

  // Sincronizar classe no body para desktop collapsed
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  // Fechar drawer mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Bloquear scroll do body quando drawer mobile está aberto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  let navItems = adminNavItems;
  if (role === 'COORDENADOR') navItems = coordinatorNavItems;
  if (role === 'PROFESSOR') navItems = professorNavItems;

  const roleHref = `/${role === 'COORDENADOR' ? 'coordinator' : role.toLowerCase()}`;

  const navContent = (
    <nav className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'px-4'} mt-4 overflow-y-auto`}>
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
  );

  const footerContent = (
    <div className="mt-auto space-y-2 pb-2">
      {role === 'PROFESSOR' && (
        <div className="px-4">
          <Link
            href="/professor/new-exam"
            className={`flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary transition-all text-primary hover:text-black py-4 rounded-2xl border border-black/5 dark:border-white/[0.02] group shadow-lg ${isCollapsed ? 'px-0' : 'px-4'}`}
            title="Nova Prova"
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform shrink-0">add_circle</span>
            {!isCollapsed && <span className="font-bold text-body whitespace-nowrap">Nova Prova</span>}
          </Link>
        </div>
      )}

      <div className="border-t border-black/5 dark:border-outline-variant pt-2 px-2">
        <button
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-4 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021] transition-colors`}
          title="Sair"
        >
          <span className="material-symbols-outlined text-2xl shrink-0">logout</span>
          {!isCollapsed && <span className="font-bold text-body whitespace-nowrap">Sair</span>}
        </button>
      </div>

      <div className="px-4 py-3 opacity-30 hover:opacity-100 transition-opacity flex justify-center text-black dark:text-white">
        <img src={isCollapsed ? "/favicon.svg" : "/RaedLogo.svg"} alt="Raed" className="h-5 dark:brightness-0 dark:invert opacity-70 dark:opacity-100 object-contain" />
      </div>
    </div>
  );

  return (
    <>
      {/* ====== DESKTOP SIDEBAR ====== */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 layout-sidebar bg-gray-50/80 dark:bg-[#121315]/80 backdrop-blur-xl border-r border-black/5 dark:border-outline-variant z-50 flex-col font-['Inter'] group/sidebar">
        {/* Header desktop */}
        <div className={`p-6 pb-2 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} relative shrink-0`}>
          <Link href={roleHref} className="flex items-center gap-3 group shrink-0">
            <LogoProfacher className="w-10 h-10 text-gray-900 dark:text-white transition-transform group-hover:scale-105 shrink-0" hoverBlink={true} />
            {!isCollapsed && (
              <div className="whitespace-nowrap transition-opacity duration-300">
                <h1 className="text-2xl font-black tracking-tighter text-on-surface">Prof<span className="text-primary">acher</span></h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role}</p>
              </div>
            )}
          </Link>
          {/* Botão recolher desktop */}
          <button
            onClick={toggleSidebar}
            className={`absolute -right-3 top-8 bg-surface-container border border-outline-variant rounded-full w-6 h-6 flex items-center justify-center text-gray-500 hover:text-primary z-50 transition-transform ${isCollapsed ? 'rotate-180' : ''} opacity-0 group-hover/sidebar:opacity-100 shadow-md`}
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
        </div>

        {navContent}
        {footerContent}
      </aside>

      {/* ====== MOBILE DRAWER ====== */}
      {/* Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-gray-50 dark:bg-[#121315] border-r border-black/5 dark:border-outline-variant z-50 flex flex-col font-['Inter'] transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header mobile */}
        <div className="p-6 pb-2 flex items-center justify-between shrink-0">
          <Link href={roleHref} className="flex items-center gap-3 group">
            <LogoProfacher className="w-10 h-10 text-gray-900 dark:text-white transition-transform group-hover:scale-105" hoverBlink={true} />
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-on-surface">Prof<span className="text-primary">acher</span></h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role}</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mobile nav com isCollapsed sempre false */}
        <nav className="flex-1 space-y-1 px-4 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.disabled) {
              return (
                <div key={item.label} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl opacity-40 cursor-not-allowed" title="Em breve">
                  <span className="material-symbols-outlined text-2xl text-gray-500 shrink-0">{item.icon}</span>
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
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021]'}`}
              >
                <span className={`material-symbols-outlined text-2xl shrink-0 ${isActive ? 'text-primary' : ''}`}>{item.icon}</span>
                <span className="font-bold text-body">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer mobile */}
        <div className="mt-auto space-y-2 pb-2">
          {role === 'PROFESSOR' && (
            <div className="px-4">
              <Link
                href="/professor/new-exam"
                className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary transition-all text-primary hover:text-black py-4 px-4 rounded-2xl border border-black/5 dark:border-white/[0.02] font-bold"
              >
                <span className="material-symbols-outlined text-2xl">add_circle</span>
                <span>Nova Prova</span>
              </Link>
            </div>
          )}
          <div className="border-t border-black/5 dark:border-outline-variant pt-2 px-2">
            <button
              onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1f2021] transition-colors"
            >
              <span className="material-symbols-outlined text-2xl shrink-0">logout</span>
              <span className="font-bold text-body">Sair</span>
            </button>
          </div>
          <div className="px-4 py-3 opacity-30 hover:opacity-100 transition-opacity flex justify-center">
            <img src="/RaedLogo.svg" alt="Raed" className="h-5 dark:brightness-0 dark:invert opacity-70 dark:opacity-100 object-contain" />
          </div>
        </div>
      </aside>
    </>
  );
}
