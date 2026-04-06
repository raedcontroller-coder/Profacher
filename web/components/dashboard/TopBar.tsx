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
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-[#121315]/80 backdrop-blur-xl flex justify-between items-center px-8 border-b border-outline-variant/10 font-['Inter']">
      <div className="flex items-center gap-8">
        <span className="text-sm uppercase tracking-widest text-gray-400">Exam Intelligence</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
          <div className="text-right">
            <p className="text-xs uppercase tracking-tighter text-gray-500">{roleLabel}</p>
            <p className="text-xs font-bold text-on-surface">{userName}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center font-bold text-sm ring-2 ring-primary/20">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
