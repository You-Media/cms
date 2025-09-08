"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { APP_ROUTES } from '@/config/routes'

export default function HomePage() {
  const router = useRouter()
  const { token, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  
  // Evita hydration mismatch per esportazione statica
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Redirect logic solo dopo mount per evitare problemi con static export
  useEffect(() => {
    if (!mounted) return
    
    // Se l'utente è autenticato, vai alla dashboard
    if (token) {
      router.replace(APP_ROUTES.DASHBOARD.HOME)
      return
    }
    
    // Se non è in loading e non è autenticato, vai al login
    if (!isLoading) {
      router.replace(APP_ROUTES.AUTH.LOGIN)
    }
  }, [mounted, token, isLoading, router])
  
  // Durante il caricamento o prima del mount, mostra loading
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="text-gray-700 dark:text-gray-300">
            Caricamento...
          </span>
        </div>
      </div>
    )
  }
  
  // Se siamo qui, significa che stiamo per fare redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        <span className="text-gray-700 dark:text-gray-300">
          Reindirizzamento...
        </span>
      </div>
    </div>
  )
}
