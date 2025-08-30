'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/config/routes'
import { roleLabelIt } from '@/types/roles'
import { useNotifications } from '@/hooks/use-notifications'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { PaginationBar } from '@/components/table/PaginationBar'
import { useTopWeeklyArticles } from '@/hooks/use-top-weekly-articles'
import { statusColorClass } from '@/types/articles'
import AdjustWeeklyViewsModal from '@/components/forms/adjust-weekly-views-modal'

export default function DashboardPage() {
  const { user } = useAuth()
  const { hasPermission, hasAnyPermission } = useAuth()
  const { selectedSite, hasAnyRole } = useAuth()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const didFetchRef = useRef(false)

  // Quick action permissions
  const canCreateArticle = hasAnyPermission(['create_content'])
  const canCreateBanner = hasAnyPermission(['create_banner'])
  const canCreateUser = hasAnyPermission([
    'manage_users',
    'manage_publishers',
    'manage_editors_in_chief',
    'manage_advertising_managers',
    'manage_journalists',
  ])
  const canCreateCategory = (
    selectedSite === 'editoria' &&
    hasAnyRole(['ADMIN', 'Publisher', 'EditorInChief']) &&
    hasPermission('manage_categories')
  )
  const canCreateTag = (
    selectedSite === 'editoria' &&
    hasAnyRole(['ADMIN', 'Publisher', 'EditorInChief']) &&
    hasPermission('manage_tags')
  )

  useEffect(() => {
    if (didFetchRef.current) return
    didFetchRef.current = true
    fetchMe()
  }, [fetchMe])

  const { items: notifications, loading: notificationsLoading, fetchNotifications, page: notificationsPage, perPage: notificationsPerPage, total: notificationsTotal, totalPages: notificationsTotalPages, setPage: setNotificationsPage, setPerPage: setNotificationsPerPage } = useNotifications()
  const didLoadNotificationsRef = useRef(false)

  useEffect(() => {
    if (didLoadNotificationsRef.current) return
    didLoadNotificationsRef.current = true
    fetchNotifications({ page: 1, per_page: 10 })
  }, [fetchNotifications])

  const columns = useMemo<DataTableColumn<any>[]>(() => [
    {
      key: 'message',
      header: 'Messaggio',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900 dark:text-white">{row.message}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{row.type}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Attore',
      cell: (row) => {
        const actorName = row?.actor?.name || row?.actor_name || '-'
        const avatar = row?.actor?.avatar
        return (
          <div className="flex items-center gap-2">
            {avatar ? (
              <img src={avatar} alt={actorName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <span className="text-sm text-gray-900 dark:text-white">{actorName}</span>
          </div>
        )
      },
      thClassName: 'px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-60',
    },
    {
      key: 'created_at',
      header: 'Data',
      cell: (row) => <span className="text-sm text-gray-900 dark:text-white">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</span>,
      thClassName: 'px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-48',
    },
  ], [])

  // Top weekly articles (only for 'editoria')
  const { items: topWeekly, loading: topWeeklyLoading, fetchTop } = useTopWeeklyArticles()
  const didLoadTopRef = useRef(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  useEffect(() => {
    if (selectedSite === 'editoria' && !didLoadTopRef.current) {
      didLoadTopRef.current = true
      fetchTop()
    }
  }, [selectedSite, fetchTop])

  const formatDateSafe = (value?: string | null) => {
    if (!value) return '-'
    const d = new Date(value)
    // Se non è una data ISO valida, restituisci la stringa così com'è (es. "3 ore fa")
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('it-IT')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Benvenuto nel tuo pannello di controllo CMS
        </p>
      </div>

      {/* Welcome card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {user?.profile.profile_photo && (
            <img 
              src={user.profile.profile_photo} 
              alt={user.profile.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Benvenuto, {user?.profile.full_name}!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {user?.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.roles.map((role) => (
                <span 
                  key={role}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  {roleLabelIt(role)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top weekly articles - only for 'editoria' */}
      {selectedSite === 'editoria' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top 3 articoli della settimana</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Articoli più letti negli ultimi 7 giorni</p>
            </div>
            {hasAnyRole(['ADMIN']) && (
              <Button type="button" onClick={() => setAdjustOpen(true)} className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
                Modifica articoli in evidenza
              </Button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {topWeeklyLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              ))
            ) : (Array.isArray(topWeekly) && topWeekly.length > 0 ? topWeekly.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
                {a.cover_preview ? (
                  <div className="h-36 w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
                    <img src={a.cover_preview} alt={a.title} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          title={a.status ?? undefined}
                          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${statusColorClass(a.status)}`}
                        />
                        <div className="text-sm font-semibold text-gray-900 dark:text-white whitespace-normal break-words" title={a.title}>{a.title}</div>
                      </div>
                      {/* meta spostata nel footer */}
                    </div>
                    {typeof a.weekly_views === 'number' ? (
                      <div className="ml-3 inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold" title="Visualizzazioni settimanali">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" /></svg>
                        {a.weekly_views}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between mt-auto">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.author?.name || '—'}</div>
                    {a.show_link ? (
                      <a href={a.show_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">
                        Vedi articolo
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0 0L10 21l-7-7L14 3z" /></svg>
                      </a>
                    ) : <div />}
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-3">
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">Nessun dato disponibile</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdjustWeeklyViewsModal open={adjustOpen} onClose={() => setAdjustOpen(false)} onSuccess={() => fetchTop()} />

      {/* Quick Actions */}
      {(canCreateArticle || canCreateBanner || canCreateUser || canCreateCategory || canCreateTag) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Azioni Rapide
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Crea rapidamente nuove risorse
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {canCreateCategory && (
              <Link href={`${APP_ROUTES.DASHBOARD.CATEGORIES.LIST}?create=1`}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Nuova categoria
                </Button>
              </Link>
            )}

            {canCreateTag && (
              <Link href={`${APP_ROUTES.DASHBOARD.TAGS.LIST}?create=1`}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7-7A1 1 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Nuovo tag
                </Button>
              </Link>
            )}
            {canCreateArticle && (
              <Link href={APP_ROUTES.DASHBOARD.ARTICLES.NEW}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6M9 16h6" />
                  </svg>
                  Nuovo articolo
                </Button>
              </Link>
            )}
            {canCreateBanner && (
              <Link href={APP_ROUTES.DASHBOARD.BANNERS.NEW}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h8" />
                  </svg>
                  Nuovo banner
                </Button>
              </Link>
            )}
            {canCreateUser && (
              <Link href={APP_ROUTES.DASHBOARD.USERS.NEW}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  Nuovo utente
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}


      {/* Recent activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Attività Recenti
          </h3>
        </div>
        <div className="p-6">
          <DataTable
            data={notifications}
            loading={notificationsLoading}
            loadingLabel="Caricamento attività..."
            emptyTitle="Nessuna attività recente"
            emptySubtitle="Quando accadrà qualcosa, lo vedrai qui"
            columns={columns}
            rowKey={(row) => row.id}
          />
          <div className="mt-4">
            <PaginationBar
              total={notificationsTotal}
              currentPage={notificationsPage}
              totalPages={notificationsTotalPages}
              perPage={notificationsPerPage}
              setPerPage={(n) => {
                setNotificationsPerPage(n)
                // reset page to 1 when perPage changes
                fetchNotifications({ page: 1, per_page: n })
              }}
              canGoPrev={notificationsPage > 1 && !notificationsLoading}
              canGoNext={notificationsPage < notificationsTotalPages && !notificationsLoading}
              onPrev={() => fetchNotifications({ page: Math.max(1, notificationsPage - 1), per_page: notificationsPerPage })}
              onNext={() => fetchNotifications({ page: Math.min(notificationsTotalPages, notificationsPage + 1), per_page: notificationsPerPage })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
