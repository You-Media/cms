"use client"

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { APP_ROUTES } from '@/config/routes'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const pathname = usePathname()
  const { token, isLoading } = useAuth()

  // Leggi eventuale token persistito per evitare redirect prematuri prima dell'hydration
  const hasPersistedToken = useMemo(() => {
    if (typeof window === 'undefined') return false
    try {
      const raw = localStorage.getItem('auth-storage')
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return Boolean(parsed?.state?.token)
    } catch {
      return false
    }
  }, [])

  // Durante static export (typeof window === 'undefined'), non fare mai redirect
  const isStaticExport = typeof window === 'undefined'

  // Mostra loading mentre lo stato si sta idratando
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="text-gray-700 dark:text-gray-300">Caricamento...</span>
        </div>
      </div>
    )
  }

  // Se non c'è token dopo l'idratazione
  if (!token) {
    // Durante static export, renderizza sempre i children per evitare redirect hardcoded
    if (isStaticExport) {
      return <>{children}</>
    }
    
    if (hasPersistedToken) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Caricamento...</span>
          </div>
        </div>
      )
    }
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Accesso richiesto
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Effettua il login per accedere a questa pagina.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
