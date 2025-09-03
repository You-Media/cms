'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NewBannerPage from '../new/page'
import { useAuth } from '@/hooks/use-auth'

export default function EditBannerPage() {
  const { hasPermission } = useAuth()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const router = useRouter()

  useEffect(() => {
    if (!id) {
      router.replace('/dashboard/banners')
    }
  }, [id, router])

  if (!id) return null

  if (!hasPermission('edit_banner')) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per modificare i banner.</p>
      </div>
    )
  }

  return <NewBannerPage />
}


