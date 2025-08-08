'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/config/routes'

interface LogoutButtonProps {
  variant?: 'default' | 'menu'
}

export function LogoutButton({ variant = 'default' }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { logout } = useAuthStore()

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logout()
      toast.success('Logout effettuato', {
        description: 'Sei stato disconnesso con successo.',
        duration: 2000,
      })
      router.push(APP_ROUTES.AUTH.LOGIN)
    } catch (error) {
      toast.error('Errore durante il logout', {
        description: 'Si è verificato un errore durante la disconnessione.',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="w-full text-left px-0 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center space-x-2 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>{isLoading ? 'Disconnessione...' : 'Logout'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {isLoading ? 'Disconnessione...' : 'Logout'}
    </button>
  )
}
