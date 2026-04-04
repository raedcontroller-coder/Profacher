'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[35%] bg-tertiary-container/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg liquid-glass rounded-[3rem] p-12 flex flex-col items-center text-center space-y-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(192,193,255,0.3)]">
            <span className="material-symbols-outlined text-on-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h1 className="text-4xl font-headline font-bold tracking-tighter text-on-surface">Profacher <span className="text-primary">2.0</span></h1>
          <p className="text-on-surface-variant text-lg">Portal Integrado de Exames e IA</p>
        </div>
        
        <div className="w-full pt-4">
          <Link 
            href="/login"
            className="w-full bg-surface-container-highest/50 border border-outline-variant/20 text-on-surface font-semibold py-4 rounded-xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-3 group relative"
          >
            <span className="material-symbols-outlined">login</span>
            Acessar o Sistema
            <span className="material-symbols-outlined absolute right-16 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all text-primary">arrow_forward</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
