"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function DashboardRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace(APP_ROUTES.DASHBOARD.HOME)
  }, [router])
  return null
}
