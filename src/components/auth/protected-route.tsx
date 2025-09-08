'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { APP_ROUTES } from '@/config/routes'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, isLoading } = useAuth()

  // Debug render
  console.log('[ProtectedRoute] render', { pathname, hasToken: Boolean(token), isLoading })

  useEffect(() => {
    // Aspetta che lo stato sia completamente idratato prima di controllare l'autenticazione
    if (!isLoading) {
      console.log('[ProtectedRoute] effect', { pathname, hasToken: Boolean(token), isLoading })
      if (!token) {
        console.warn('[ProtectedRoute] missing token -> redirect to login', { pathname })
        router.push(APP_ROUTES.AUTH.LOGIN)
      } else {
        console.log('[ProtectedRoute] token present -> allow', { pathname })
      }
    }
  }, [token, isLoading, router])

  // Mostra loading mentre lo stato si sta idratando
  if (isLoading) {
    console.log('[ProtectedRoute] loading', { pathname })
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="text-gray-700 dark:text-gray-300">Caricamento...</span>
        </div>
      </div>
    )
  }

  // Se non c'è utente o token dopo l'idratazione, mostra fallback
  if (!token) {
    console.log('[ProtectedRoute] fallback (no token)', { pathname })
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

  console.log('[ProtectedRoute] render children', { pathname })
  return <>{children}</>
}
