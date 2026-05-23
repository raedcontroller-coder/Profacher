'use client'

import React from 'react';

interface TopBarProps {
  userName: string;
  roleLabel: string;
}

export default function TopBar({ userName, roleLabel }: TopBarProps) {
  // Iniciais do usuário
  const initials = userName === "Carregando..." || userName === "Usuário" 
    ? "?" 
    : userName.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <header className="fixed top-0 right-0 layout-header h-16 z-40 bg-gray-50/80 dark:bg-[#121315]/80 backdrop-blur-xl flex justify-between items-center px-8 border-b border-black/5 dark:border-outline-variant font-['Inter']">
      <div className="flex items-center gap-8">
        <span className="text-caption text-gray-500">Exam Intelligence</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-4 border-l border-black/5 dark:border-outline-variant">
          <div className="text-right">
            <p className="text-caption text-primary/70">{roleLabel}</p>
            <p className="text-body font-bold text-gray-900 dark:text-on-surface">{userName}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center font-bold text-base text-white ring-2 ring-primary/20">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
