"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function HomePage() {
  const router = useRouter()
  
  // Solo redirect browser-side (non durante export)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.replace(APP_ROUTES.AUTH.LOGIN)
    }
  }, [router])
  
  // Durante static export, renderizza loader invece di null
  if (typeof window === 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="text-gray-700 dark:text-gray-300">Caricamento...</span>
        </div>
      </div>
    )
  }
  
  // Browser-side: mostra loader durante redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        <span className="text-gray-700 dark:text-gray-300">Reindirizzamento...</span>
      </div>
    </div>
  )
}
