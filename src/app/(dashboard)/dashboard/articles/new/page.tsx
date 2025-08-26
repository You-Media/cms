'use client'

import { useAuth } from '@/hooks/use-auth'

export default function NewArticlePage() {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()
  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)
  const canCreate = hasPermission('create_article')

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }
  if (!canCreate) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per creare articoli.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Nuovo articolo</h1>
      <p className="text-sm text-gray-500 mt-2">Stub del form creazione articoli. Implementazione completa in un secondo step.</p>
    </div>
  )
}


