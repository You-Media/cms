"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function HomePage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  useEffect(() => {
    setIsRedirecting(true)
    router.replace(APP_ROUTES.AUTH.LOGIN)
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        <span className="text-gray-700 dark:text-gray-300">
          {isRedirecting ? 'Reindirizzamento...' : 'Caricamento...'}
        </span>
      </div>
    </div>
  )
}
