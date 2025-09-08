"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function HomePage() {
  const router = useRouter()
  
  // Non fare redirect durante static export
  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.replace(APP_ROUTES.AUTH.LOGIN)
    }
  }, [router])
  
  return null
}
