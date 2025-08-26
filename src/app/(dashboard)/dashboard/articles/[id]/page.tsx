'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS } from '@/config/endpoints'
import { api, ApiError } from '@/lib/api'
import { APP_ROUTES } from '@/config/routes'
import { toast } from 'sonner'

export default function EditArticlePage() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const router = useRouter()
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()
  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)
  const canEdit = hasPermission('edit_article')
  const canDelete = hasPermission('delete_content')

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Modifica articolo</h1>
          <p className="text-sm text-gray-500 mt-2">Stub pagina modifica per articolo #{id}. Implementazione completa in un secondo step.</p>
        </div>
        {canDelete && (
          <Button
            variant="destructive"
            onClick={async () => {
              if (!id) return
              const ok = window.confirm(`Confermi l'eliminazione dell'articolo #${id}?`)
              if (!ok) return
              try {
                await api.delete(API_ENDPOINTS.ARTICLES.DELETE(id), undefined, { suppressGlobalToasts: true })
                toast.success('Articolo eliminato')
                router.push(APP_ROUTES.DASHBOARD.ARTICLES.LIST)
              } catch (error) {
                if (error instanceof ApiError && error.status === 403) {
                  toast.error('Non sei autorizzato a fare questa operazione')
                } else {
                  toast.error('Eliminazione non riuscita')
                }
              }
            }}
          >
            Elimina
          </Button>
        )}
      </div>
    </div>
  )
}


