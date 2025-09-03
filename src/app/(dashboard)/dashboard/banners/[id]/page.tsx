'use client'

import { redirect, useParams } from 'next/navigation'
import NewBannerPage from '../new/page'
import { useAuth } from '@/hooks/use-auth'

export default function EditBannerPage() {
  const { hasPermission } = useAuth()
  const params = useParams() as { id?: string }

  // Se manca id, torna alla lista
  if (!params?.id) {
    redirect('/dashboard/banners')
  }

  // Permessi: per coerenza, richiediamo almeno edit_banner
  if (!hasPermission('edit_banner')) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per modificare i banner.</p>
      </div>
    )
  }

  // Temporaneamente riutilizziamo il form di creazione anche in edit
  return <NewBannerPage />
}


