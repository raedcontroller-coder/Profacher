'use client'

import React from 'react';
import { useSidebarStore } from '@/store/useSidebarStore';

interface TopBarProps {
  userName: string;
  roleLabel: string;
}

export default function TopBar({ userName, roleLabel }: TopBarProps) {
  const { toggleMobile } = useSidebarStore();

  // Iniciais do usuário
  const initials = userName === "Carregando..." || userName === "Usuário"
    ? "?"
    : userName.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <header className="fixed top-0 right-0 layout-header h-16 z-40 bg-gray-50/80 dark:bg-[#121315]/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-8 border-b border-black/5 dark:border-outline-variant font-['Inter']">
      <div className="flex items-center gap-4">
        {/* Botão hamburguer — visível apenas em mobile */}
        <button
          onClick={toggleMobile}
          className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          aria-label="Abrir menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="text-caption text-gray-500 hidden sm:block">Exam Intelligence</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-4 border-l border-black/5 dark:border-outline-variant">
          <div className="text-right hidden sm:block">
            <p className="text-caption text-primary/70">{roleLabel}</p>
            <p className="text-body font-bold text-gray-900 dark:text-on-surface">{userName}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center font-bold text-base text-white ring-2 ring-primary/20 shrink-0">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
