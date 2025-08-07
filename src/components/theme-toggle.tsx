'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()

  if (!mounted) return null

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 border-2 border-white/20 dark:border-gray-800/20"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 mx-auto" />
      ) : (
        <Moon className="h-5 w-5 mx-auto" />
      )}
    </button>
  )
}
