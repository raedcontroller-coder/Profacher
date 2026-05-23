'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-[120px] h-10 bg-white/5 animate-pulse rounded-lg" />
    )
  }

  return (
    <div className="flex bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-1 relative overflow-hidden shadow-inner">
      <button
        onClick={() => setTheme('light')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
          theme === 'light' 
            ? 'bg-white text-primary shadow-sm scale-100' 
            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">light_mode</span>
        Claro
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#1a1b1e] text-primary shadow-sm scale-100 border border-white/5' 
            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white scale-95 hover:scale-100'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">dark_mode</span>
        Escuro
      </button>
    </div>
  )
}
