'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function EditArticlePage() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()
  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)
  const canEdit = hasPermission('edit_article')

  if (!id) {
    return null
  }

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }
  if (!canEdit) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per modificare gli articoli.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Modifica articolo</h1>
      <p className="text-sm text-gray-500 mt-2">Stub pagina modifica per articolo #{id}. Implementazione completa in un secondo step.</p>
    </div>
  )
}


