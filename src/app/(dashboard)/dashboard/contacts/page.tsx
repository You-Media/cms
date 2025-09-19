'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { APP_ROUTES } from '@/config/routes'
import { ResultsHeader } from '@/components/table/ResultsHeader'
import { PaginationBar } from '@/components/table/PaginationBar'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Button } from '@/components/ui/button'
import { useContacts } from '@/hooks/use-contacts'
import type { Contact } from '@/types/contacts'
import { CONTACT_TYPE_LABEL, contactTypeColorClass, contactTypeBadgeClass } from '@/types/contacts'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'

export default function ContactsPage() {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()

  const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: 'Europe/Rome'
    })
  }

  const allowedRoles = ['ADMIN', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)

  const { results, loading, page, totalPages, total, setPage, search } = useContacts()

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])

  useEffect(() => {
    void search({ page, per_page: 15 })
  }, [page, search])

  async function handleDelete(contact: Contact) {
    const ok = window.confirm(`Confermi l'eliminazione del contatto #${contact.id} (${contact.full_name})?`)
    if (!ok) return
    try {
      await api.delete(API_ENDPOINTS.CONTACTS.DELETE(contact.id), undefined, { suppressGlobalToasts: true })
      toast.success('Contatto eliminato')
      // refresh current page
      void search({ page, per_page: 15 })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Eliminazione non riuscita')
      }
    }
  }

  async function handleDownloadFile(contact: Contact) {
    if (!contact.file) {
      toast.error('Nessun file disponibile per questo contatto')
      return
    }
    
    try {
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

  const columns: Array<DataTableColumn<Contact>> = [
    {
      key: 'actions',
      header: 'Azioni',
      cell: (contact) => (
        <RowActions contact={contact} />
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'id',
      header: 'ID',
      cell: (contact) => (
        <div className="flex items-center gap-2">
          <span
            title={contact.type ? CONTACT_TYPE_LABEL[contact.type] : undefined}
            className={`inline-block w-2.5 h-2.5 rounded-full ${contactTypeColorClass(contact.type)}`}
          />
          <span className="text-xs font-mono">#{contact.id}</span>
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap text-center',
    },
    {
      key: 'full_name',
      header: 'Nome e Cognome',
      cell: (contact) => <span className="font-medium">{contact.full_name}</span>,
      tdClassName: 'px-6 py-4',
    },
    {
      key: 'email',
      header: 'Email',
      cell: (contact) => (
        <a 
          href={`mailto:${contact.email}`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {contact.email}
        </a>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (contact) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${contactTypeBadgeClass(contact.type)}`}>
          {CONTACT_TYPE_LABEL[contact.type]}
        </span>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'created_at',
      header: 'Data',
      cell: (contact) => <span className="text-sm">{formatDate(contact.created_at)}</span>,
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
  ]

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Richieste di Contatto"
        subtitle="Visualizza tutte le richieste di contatto e candidature"
        icon={(
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible">
        <ResultsHeader
          title="Risultati"
          subtitle={`${total} risultati`}
          rightAside={(
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-end gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" /> 
                    {CONTACT_TYPE_LABEL.contact}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> 
                    {CONTACT_TYPE_LABEL.work_with_us}
                  </div>
                </div>
              </div>
            </div>
          )}
        />
        <DataTable<Contact>
          data={Array.isArray(results) ? results : []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Caricamento contatti..."
          emptyTitle="Nessun contatto trovato"
          emptySubtitle="Non ci sono richieste di contatto al momento"
        />
      </div>

      <PaginationBar
        total={total}
        currentPage={page}
        totalPages={totalPages}
        perPage={15}
        setPerPage={() => {}} // Non modificabile per i contatti
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={() => setPage(Math.max(1, page - 1))}
        onNext={() => setPage(Math.min(totalPages, page + 1))}
      />
    </div>
  )

  function RowActions({ contact }: { contact: Contact }) {
    const [open, setOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState<null | string>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
    const menuPanelRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        const target = e.target as Node
        const insideButton = menuRef.current && menuRef.current.contains(target)
        const insidePanel = menuPanelRef.current && menuPanelRef.current.contains(target)
        if (!insideButton && !insidePanel) setOpen(false)
      }
      document.addEventListener('mousedown', onDocClick)
      return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    useEffect(() => {
      function positionMenu() {
        if (!open) return
        const btn = buttonRef.current
        const MENU_WIDTH = 192
        const ESTIMATED_MENU_HEIGHT = 80
        const GAP = 8
        if (btn) {
          const rect = btn.getBoundingClientRect()
          let left = rect.left
          let top = rect.bottom + GAP
          
          // Check if there's space below, otherwise position above
          if (top + ESTIMATED_MENU_HEIGHT > window.innerHeight - 8) {
            top = rect.top - GAP - ESTIMATED_MENU_HEIGHT
            // If still not enough space above, position at the best available spot
            if (top < 8) {
              top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - ESTIMATED_MENU_HEIGHT - 8))
            }
          }
          
          // keep within viewport horizontally
          if (left + MENU_WIDTH > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - MENU_WIDTH - 8)
          }
          if (left < 8) left = 8
          setMenuPos({ top, left })
        }
      }
      positionMenu()
      window.addEventListener('resize', positionMenu)
      window.addEventListener('scroll', positionMenu, true)
      return () => {
        window.removeEventListener('resize', positionMenu)
        window.removeEventListener('scroll', positionMenu, true)
      }
    }, [open])

    // After panel mounts, fine-tune position with actual dimensions
    useEffect(() => {
      if (!open) return
      const btn = buttonRef.current
      const panel = menuPanelRef.current
      if (!btn || !panel) return
      const rect = btn.getBoundingClientRect()
      const GAP = 8
      const MARGIN = 8
      const h = panel.offsetHeight || 0
      const w = panel.offsetWidth || 192
      
      let left = rect.left
      let top = rect.bottom + GAP
      
      // Precise vertical positioning with actual height
      if (top + h > window.innerHeight - MARGIN) {
        // Try positioning above
        const topAbove = rect.top - GAP - h
        if (topAbove >= MARGIN) {
          top = topAbove
        } else {
          // Neither above nor below fits well, position at best spot
          top = Math.max(MARGIN, Math.min(topAbove, window.innerHeight - h - MARGIN))
        }
      }
      
      // Precise horizontal positioning with actual width
      if (left + w > window.innerWidth - MARGIN) {
        left = Math.max(MARGIN, window.innerWidth - w - MARGIN)
      }
      if (left < MARGIN) left = MARGIN
      
      setMenuPos({ top, left })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    return (
      <div className="relative" ref={menuRef}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 w-9 p-0 flex items-center justify-center"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Azioni contatto #${contact.id}`}
          ref={buttonRef}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </Button>
        {open && menuPos && createPortal(
          <div ref={menuPanelRef} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }} className="w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-[2000] py-1">
            <Link
              href={APP_ROUTES.DASHBOARD.CONTACTS.DETAIL(contact.id)}
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Mostra dettagli
            </Link>
            {contact.file && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                disabled={!!actionLoading}
                onClick={async () => {
                  setOpen(false)
                  try {
                    setActionLoading('download')
                    await handleDownloadFile(contact)
                  } finally {
                    setActionLoading(null)
                  }
                }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {actionLoading === 'download' ? 'Download...' : 'Scarica file'}
              </button>
            )}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              disabled={!!actionLoading}
              onClick={async () => {
                setOpen(false)
                try {
                  setActionLoading('delete')
                  await handleDelete(contact)
                } finally {
                  setActionLoading(null)
                }
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {actionLoading === 'delete' ? 'Eliminazione...' : 'Elimina'}
            </button>
          </div>, document.body
        )}
      </div>
    )
  }
}
