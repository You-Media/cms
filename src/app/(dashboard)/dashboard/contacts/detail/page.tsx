'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { APP_ROUTES } from '@/config/routes'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS } from '@/config/endpoints'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import type { Contact } from '@/types/contacts'
import { CONTACT_TYPE_LABEL, contactTypeBadgeClass } from '@/types/contacts'
import { LoadingIndicator } from '@/components/ui/loading-indicator'

export default function ContactDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { selectedSite, hasAnyRole } = useAuth()
  
  const contactId = searchParams.get('id')
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  const allowedRoles = ['ADMIN', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)

  useEffect(() => {
    if (!contactId) {
      router.replace(APP_ROUTES.DASHBOARD.CONTACTS.LIST)
      return
    }
  }, [contactId, router])

  useEffect(() => {
    if (!canView || !contactId || hasLoadedRef.current) return
    
    const fetchContact = async () => {
      try {
        setLoading(true)
        const response = await api.get<{ status: string; message: string; data: Contact }>(API_ENDPOINTS.CONTACTS.DETAIL(contactId), undefined, { suppressGlobalToasts: true })
        // Estrai i dati dall'oggetto response
        const contactData = response.data || response
        setContact(contactData)
        hasLoadedRef.current = true
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          toast.error('Contatto non trovato')
          router.push(APP_ROUTES.DASHBOARD.CONTACTS.LIST)
        } else if (error instanceof ApiError && error.status === 403) {
          toast.error('Non hai i permessi per visualizzare questo contatto')
          router.push(APP_ROUTES.DASHBOARD.CONTACTS.LIST)
        } else {
          toast.error('Errore durante il caricamento del contatto')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchContact()
  }, [canView, contactId, router])

  if (!contactId) return null

  const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Rome'
    })
  }

  async function handleDownloadFile() {
    if (!contact?.file) {
      toast.error('Nessun file disponibile per questo contatto')
      return
    }
    
    try {
      setActionLoading('download')
      // Usa fetch direttamente per gestire i file binari con autenticazione
      const url = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.CONTACTS.DOWNLOAD_FILE(contact.id)}`
      
      // Ottieni il token dall'API client
      const headers: Record<string, string> = {}
      if (api['token']) {
        headers.Authorization = `Bearer ${api['token']}`
      }
      if (api['tempAuthToken']) {
        headers['X-Temp-Auth-Token'] = api['tempAuthToken']
      }
      if (api['selectedSite']) {
        headers['X-Site'] = api['selectedSite']
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiError(401, 'Token is invalid or expired')
        } else if (response.status === 404) {
          throw new ApiError(404, 'File not found')
        } else {
          throw new ApiError(response.status, 'Download failed')
        }
      }
      
      // Crea un blob dal response
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Crea un link temporaneo per il download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = contact.file.name || `contact-${contact.id}-file`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast.success('Download avviato')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        toast.error('Sessione scaduta, effettua nuovamente il login')
      } else if (error instanceof ApiError && error.status === 404) {
        toast.error('File non trovato')
      } else {
        toast.error('Errore durante il download del file')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    if (!contact) return
    
    const ok = window.confirm(`Confermi l'eliminazione del contatto #${contact.id} (${contact.full_name})?`)
    if (!ok) return
    
    try {
      setActionLoading('delete')
      await api.delete(API_ENDPOINTS.CONTACTS.DELETE(contact.id), undefined, { suppressGlobalToasts: true })
      toast.success('Contatto eliminato')
      router.push(APP_ROUTES.DASHBOARD.CONTACTS.LIST)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Eliminazione non riuscita')
      }
    } finally {
      setActionLoading(null)
    }
  }

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingIndicator label="Caricamento contatto..." inline={false} />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Contatto non trovato</h1>
        <p className="text-sm text-gray-500 mt-2">Il contatto richiesto non esiste o è stato rimosso.</p>
        <Link href={APP_ROUTES.DASHBOARD.CONTACTS.LIST} className="mt-4 inline-block">
          <Button variant="outline">Torna alla lista</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title={`Contatto #${contact.id}`}
        subtitle={`Dettagli completi per ${contact.full_name}`}
        icon={(
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informazioni principali */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Informazioni Personali</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nome</label>
                <p className="text-sm font-medium">{contact.first_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Cognome</label>
                <p className="text-sm font-medium">{contact.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                <p className="text-sm">
                  <a 
                    href={`mailto:${contact.email}`}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {contact.email}
                  </a>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefono</label>
                <p className="text-sm">{contact.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo</label>
                <p className="text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${contactTypeBadgeClass(contact.type)}`}>
                    {CONTACT_TYPE_LABEL[contact.type]}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {contact.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4">Note</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {contact.extra && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4">Informazioni Aggiuntive</h2>
              <div className="space-y-2">
                {Object.entries(contact.extra).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <p className="text-sm">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Azioni</h2>
            <div className="space-y-3">
              {contact.file && (
                <Button
                  onClick={handleDownloadFile}
                  disabled={!!actionLoading}
                  className="w-full"
                  variant="outline"
                >
                  {actionLoading === 'download' ? (
                    <LoadingIndicator size="xs" label="Download..." />
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Scarica file
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="w-full"
                variant="destructive"
              >
                {actionLoading === 'delete' ? (
                  <LoadingIndicator size="xs" label="Eliminazione..." />
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Elimina contatto
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Informazioni Sistema</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ID</label>
                <p className="text-sm font-mono">#{contact.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Creato il</label>
                <p className="text-sm">{formatDate(contact.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ultimo aggiornamento</label>
                <p className="text-sm">{formatDate(contact.updated_at)}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-between items-center">
        <Link href={APP_ROUTES.DASHBOARD.CONTACTS.LIST}>
          <Button variant="outline">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Torna alla lista
          </Button>
        </Link>
      </div>
    </div>
  )
}
