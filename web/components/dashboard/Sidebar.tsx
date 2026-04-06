'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface NavItem {
  icon: string;
  label: string;
  href: string;
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
  { icon: 'group', label: 'Usuários Globais', href: '/admin/users' },
  { icon: 'security', label: 'Logs do Sistema', href: '/admin/logs' },
  { icon: 'settings', label: 'Configurações', href: '/admin/settings' },
];

interface SidebarProps {
  role: 'ADMIN' | 'COORDENADOR';
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === 'ADMIN' ? adminNavItems : coordinatorNavItems;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#121315]/80 backdrop-blur-xl border-r border-outline-variant/10 z-50 flex flex-col p-4 font-['Inter']">
      <div className="flex items-center gap-3 px-4 py-8 mb-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-black font-bold">menu_book</span>
        </div>
        <div>
          <h1 className="text-on-surface font-bold text-lg tracking-tight">Profacher</h1>
          <p className="text-xs text-primary uppercase tracking-widest font-bold">Elite Examination System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-400 hover:text-white hover:bg-[#1f2021]'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {role === 'COORDENADOR' && (
          <Link href="/coordinator/new-exam" className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary transition-all text-primary hover:text-black py-4 rounded-2xl border border-primary/20 group shadow-lg">
            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_circle</span>
            <span className="font-bold text-sm">Nova Prova</span>
          </Link>
        )}
        
        <div className="border-t border-outline-variant/10 pt-4 px-2 space-y-1">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2021] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>

        <div className="px-4 py-4 opacity-40 hover:opacity-100 transition-opacity flex justify-center text-white">
          <img src="/RaedLogo.svg" alt="Raed" className="h-6 brightness-0 invert" />
        </div>
      </div>
    </aside>
  );
}
