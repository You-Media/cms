'use client'

import { redirect, useParams } from 'next/navigation'
import NewBannerPage from '../new/page'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useRef, useState } from 'react'
import { useBanners } from '@/hooks/use-banners'
import type { Banner } from '@/types/banners'

export default function EditBannerPage() {
  const { hasPermission } = useAuth()
  const params = useParams() as { id?: string }
  const { fetchBannerDetail } = useBanners()
  const [initial, setInitial] = useState<Banner | undefined>(undefined)

  // Se manca id, torna alla lista
  if (!params?.id) {
    redirect('/dashboard/banners')
  }

  // Recupera dettaglio se non passato via store
  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    const id = params?.id ? Number(params.id) : undefined
    if (!id) return
    loadedRef.current = true
    fetchBannerDetail(id).then((b) => setInitial(b)).catch(() => {})
  }, [params])

  // Riutilizziamo stesso form per edit; backend è polivalente

  // Permessi: per coerenza, richiediamo almeno create_banner (o in futuro edit_banner)
  if (!hasPermission('edit_banner')) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per modificare i banner.</p>
      </div>
    )
  }

  return <NewBannerPage initialBanner={initial} isEdit={true} />
}


