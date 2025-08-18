'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { FiltersCard } from '@/components/table/FiltersCard'
import { ResultsHeader } from '@/components/table/ResultsHeader'
import { PaginationBar } from '@/components/table/PaginationBar'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useUsers, type UserRoleFilter, fetchPermissionsByRole, blockUserPermissions, unblockUserPermissions, deleteUser, type RolePermissionItem, fetchUserDetail } from '@/hooks/use-users'
import { toast } from 'sonner'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

export default function UsersPage() {
  const { selectedSite, hasAnyRole, hasPermission, isSuperAdmin } = useAuth()
  const { rows, loading, total, currentPage, totalPages, perPage, setPerPage, searchUsers, updateCachedUserPermissions } = useUsers()

  // Accesso consentito solo su sito "editoria"
  const siteAllowed = selectedSite === 'editoria'

  // Regola di visibilità in base a ruolo e permessi specifici
  const hasUsersVisibility = (() => {
    if (!hasAnyRole(['Admin', 'Publisher', 'EditorInChief'])) return false
    // Admin: almeno uno tra manage_publishers | manage_editors_in_chief | manage_advertising_managers
    if (hasAnyRole(['Admin'])) {
      return (
        hasPermission('manage_publishers') ||
        hasPermission('manage_editors_in_chief') ||
        hasPermission('manage_advertising_managers')
      )
    }
    // Publisher: almeno uno tra manage_editors_in_chief | manage_advertising_managers
    if (hasAnyRole(['Publisher'])) {
      return (
        hasPermission('manage_editors_in_chief') ||
        hasPermission('manage_advertising_managers')
      )
    }
    // EditorInChief: deve avere manage_journalists
    if (hasAnyRole(['EditorInChief'])) {
      return hasPermission('manage_journalists')
    }
    return false
  })()

  if (!siteAllowed) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Utenti</h1>
        <p className="text-sm text-gray-500 mt-2">Risorsa non disponibile per il sito selezionato.</p>
      </div>
    )
  }

  if (!hasUsersVisibility) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  // Stato locale filtri
  const [search, setSearch] = useState('')
  const [page, setPage] = useState<number>(1)
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter | ''>('')
  const ALL_VALUE = '__ALL__'
  const lastParamsRef = useRef<string>('')
  const prevPerPageRef = useRef<number>(perPage)
  const [permModalOpen, setPermModalOpen] = useState(false)
  const [permUser, setPermUser] = useState<{ id: number; fullName: string; permissions: string[]; roles: string[] } | null>(null)
  const [permRecommended, setPermRecommended] = useState<RolePermissionItem[]>([])
  const [permActual, setPermActual] = useState<RolePermissionItem[]>([])
  const [confirmOp, setConfirmOp] = useState<{ permission: string; label: string; type: 'block' | 'unblock' } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; roles: string[] } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])

  // Opzioni ruolo ammesse in base al ruolo utente corrente
  const allowedRoleOptions: UserRoleFilter[] = useMemo(() => {
    if (isSuperAdmin) {
      return ['EditorInChief', 'Publisher', 'AdvertisingManager', 'Journalist', 'Consumer']
    }
    const set = new Set<UserRoleFilter>()
    if (hasAnyRole(['Admin'])) {
      ;['Publisher', 'EditorInChief', 'AdvertisingManager', 'Consumer'].forEach((r) => set.add(r as UserRoleFilter))
    }
    if (hasAnyRole(['Publisher'])) {
      ;['EditorInChief', 'AdvertisingManager'].forEach((r) => set.add(r as UserRoleFilter))
    }
    if (hasAnyRole(['EditorInChief'])) {
      set.add('Journalist')
    }
    return Array.from(set)
  }, [hasAnyRole, isSuperAdmin])

  // Se l'utente è SOLO EditorInChief, deve vedere/gestire solo Giornalisti
  const isEditorInChiefOnly = useMemo(() => {
    return hasAnyRole(['EditorInChief']) && !hasAnyRole(['Admin', 'Publisher']) && !isSuperAdmin
  }, [hasAnyRole, isSuperAdmin])

  // Forza il filtro ruolo su Giornalista quando è EditorInChief-only
  useEffect(() => {
    if (isEditorInChiefOnly) {
      setRoleFilter('Journalist')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorInChiefOnly])

  const roleLabelIt = (role: UserRoleFilter): string => {
    switch (role) {
      case 'EditorInChief':
        return 'Caporedattore'
      case 'Publisher':
        return 'Editore'
      case 'AdvertisingManager':
        return 'Manager Pubblicità'
      case 'Journalist':
        return 'Giornalista'
      case 'Consumer':
        return 'Lettore'
      default:
        return role
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    const rolesParam = isEditorInChiefOnly
      ? (['Journalist'] as UserRoleFilter[])
      : (roleFilter ? [roleFilter] : (allowedRoleOptions.length > 0 ? allowedRoleOptions : undefined))
    void searchUsers({
      page: 1,
      per_page: perPage,
      search: (search.trim().length === 0 || search.trim().length >= 3) ? (search.trim() || undefined) : undefined,
      roles: rolesParam,
    })
  }

  // Auto refresh su page/perPage con reset a pagina 1 quando cambia perPage
  useEffect(() => {
    if (prevPerPageRef.current !== perPage) {
      prevPerPageRef.current = perPage
      setPage(1)
      return
    }
    const key = `${page}|${perPage}`
    if (lastParamsRef.current === key) return
    lastParamsRef.current = key
    const rolesParam = isEditorInChiefOnly
      ? (['Journalist'] as UserRoleFilter[])
      : (roleFilter ? [roleFilter] : (allowedRoleOptions.length > 0 ? allowedRoleOptions : undefined))
    void searchUsers({
      page,
      per_page: perPage,
      search: (search.trim().length === 0 || search.trim().length >= 3) ? (search.trim() || undefined) : undefined,
      roles: rolesParam,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  const columns: Array<DataTableColumn<{ id: number; fullName: string; email: string; createdAt: string | null; roles: string[]; permissions: string[]; profilePhoto?: string; articlesCount?: number }>> = [
    {
      key: 'id',
      header: (
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <span>ID</span>
        </div>
      ),
      cell: (u) => (
        <div className="flex items-center">
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">#{u.id}</div>
        </div>
      ),
    },
    {
      key: 'fullName',
      header: (
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
          </svg>
          <span>Utente</span>
        </div>
      ),
      cell: (u) => {
        const rolesNorm = (u.roles || []).map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
        const isJournalist = rolesNorm.includes('journalist')
        const count = typeof u.articlesCount === 'number' ? u.articlesCount : undefined
        return (
          <div className="flex items-center gap-3">
            {u.profilePhoto ? (
              <img src={u.profilePhoto} alt={u.fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            )}
            <div className="text-sm text-gray-900 dark:text-white">
              <div className="font-medium">{u.fullName || '-'}</div>
              {isJournalist && typeof count === 'number' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">Articoli: {count}</div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'email',
      header: (
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4H8m12-8H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V10a2 2 0 00-2-2z" />
          </svg>
          <span>Email</span>
        </div>
      ),
      cell: (u) => (
        <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono">{u.email}</code>
      ),
    },
    {
      key: 'createdAt',
      header: (
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Iscrizione</span>
        </div>
      ),
      cell: (u) => {
        const d = u.createdAt ? new Date(u.createdAt) : null
        const val = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'
        return <span className="text-sm text-gray-700 dark:text-gray-300">{val}</span>
      },
    },
    {
      key: 'roles',
      header: (
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          <span>Ruoli</span>
        </div>
      ),
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(u.roles) && u.roles.length > 0 ? (
            u.roles.map((r, idx) => (
              <span key={`${u.id}-${idx}-${r}`} className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                {roleLabelIt(r as UserRoleFilter)}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'permissions',
      header: (
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          <span>Permessi</span>
        </div>
      ),
      cell: (u) => {
        const normalized = (Array.isArray(u.roles) ? u.roles : []).map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
        const nonConsumerRoles = normalized.filter((r) => r !== 'consumer')
        if (nonConsumerRoles.length === 0) {
          return <span className="text-xs text-gray-500">-</span>
        }
        const count = Array.isArray(u.permissions) ? u.permissions.length : 0
        return (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
            onClick={async () => {
              const currentPerms = Array.isArray(u.permissions) ? u.permissions : []
              const currentRoles = Array.isArray(u.roles) ? u.roles : []
              setPermUser({ id: u.id, fullName: u.fullName, permissions: currentPerms, roles: currentRoles })
              setPermRecommended([])
              setPermActual([])
              setPermModalOpen(true)
              try {
                const nonConsumer = currentRoles.filter((r) => r.toLowerCase().replace(/[^a-z]/g, '') !== 'consumer')
                if (nonConsumer.length > 0) {
                  const res = await fetchPermissionsByRole(nonConsumer)
                  const perms = Array.isArray(res?.data) ? res.data : []
                  setPermRecommended(perms)
                }
                // Fetch dei permessi attuali con metadati (display_name/description) per fallback
                try {
                  const detailRes = await fetchUserDetail(u.id)
                  const detail = (detailRes as any)?.data || detailRes
                  const rawPerms = Array.isArray(detail?.permissions) ? detail.permissions : []
                  const meta: RolePermissionItem[] = rawPerms.map((p: any) => {
                    if (typeof p === 'string') return { name: p, display_name: p, description: '' }
                    return { name: p?.name || '', display_name: p?.display_name || (p?.name || ''), description: p?.description }
                  }).filter((x: RolePermissionItem) => x.name)
                  setPermActual(meta)
                } catch {}
              } catch {}
            }}
            aria-label={`Vedi permessi di ${u.fullName}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <span>{count > 0 ? `${count} permessi` : 'Nessuno'}</span>
          </button>
        )
      },
    },
    {
      key: 'actions',
      header: 'Azioni',
      cell: (u) => {
        const normalizedRoles = (u.roles || []).map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
        const canManageAll = hasPermission('manage_users')
        let canDelete = canManageAll
        if (!canDelete) {
          if (normalizedRoles.includes('publisher')) canDelete = hasPermission('manage_publishers')
          if (normalizedRoles.includes('editorinchief')) canDelete = canDelete || hasPermission('manage_editors_in_chief')
          if (normalizedRoles.includes('advertisingmanager')) canDelete = canDelete || hasPermission('manage_advertising_managers')
          if (normalizedRoles.includes('journalist')) canDelete = canDelete || hasPermission('manage_journalists')
        }
        const canEdit = canDelete
        return (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Link href={APP_ROUTES.DASHBOARD.USERS.EDIT(u.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifica
              </Link>
            )}
            {canDelete ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm({ id: u.id, name: u.fullName || u.email, roles: Array.isArray(u.roles) ? u.roles : [] })}
                className="flex items-center gap-1.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Elimina
              </Button>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Utenti"
        subtitle="Gestisci gli utenti del sito editoriaresponsabile.com"
        icon={(
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 21v-2a4 4 0 00-3-3.87" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        )}
      />

      <FiltersCard onSubmit={onSearchSubmit} isLoading={loading} gridCols={3} submitUseEmptyLabel={false}>
        <div className="flex flex-col justify-end h-full">
          <Label htmlFor="search" className="sr-only">Ricerca</Label>
          <div className="relative">
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="pl-10 h-12"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col justify-end h-full">
          <Label className="sr-only">Ruolo</Label>
          <Select value={isEditorInChiefOnly ? 'Journalist' : (roleFilter || ALL_VALUE)} onValueChange={(v) => setRoleFilter((v === ALL_VALUE ? '' : (v as UserRoleFilter)))} disabled={isEditorInChiefOnly}>
            <SelectTrigger className="h-12" disabled={isEditorInChiefOnly}>
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
              {!isEditorInChiefOnly && (
                <SelectItem value={ALL_VALUE}>Tutti</SelectItem>
              )}
              {allowedRoleOptions.map((r) => (
                <SelectItem key={r} value={r}>{roleLabelIt(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FiltersCard>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ResultsHeader
          title="Risultati"
          subtitle={total > 0 ? `${total} ${total === 1 ? 'utente trovato' : 'utenti trovati'}` : 'Nessun risultato'}
          actions={(
            <Link href={APP_ROUTES.DASHBOARD.USERS.NEW} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuovo utente
            </Link>
          )}
        />
        <DataTable<{ id: number; fullName: string; email: string; createdAt: string | null; roles: string[]; permissions: string[]; profilePhoto?: string }>
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Caricamento utenti..."
          emptyTitle="Nessun utente trovato"
          emptySubtitle="Prova a modificare i filtri di ricerca"
        />
      </div>

      <PaginationBar
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        perPage={perPage}
        setPerPage={setPerPage}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      {permModalOpen && permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Permessi utente</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{permUser.fullName}</p>
              </div>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                onClick={() => setPermModalOpen(false)}
                aria-label="Chiudi"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-auto space-y-4">
              {permUser.roles && permUser.roles.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-300">Ruoli: {permUser.roles.join(', ')}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  const consideredRoles = (permUser.roles || []).filter((r) => r.toLowerCase().replace(/[^a-z]/g, '') !== 'consumer')
                  if (consideredRoles.length === 0) {
                    return <div className="text-sm text-gray-500">Nessun permesso disponibile per il ruolo Consumer</div>
                  }
                  const normalizePermName = (v: any) => (typeof v === 'string' ? v : (v?.name || '')).toString()
                  const effective = new Set((permUser.permissions || []).map(normalizePermName))
                  const unionNames = Array.from(new Set([
                    ...((permUser.permissions || []).map(normalizePermName)),
                    ...((permRecommended || []).map((i) => i.name)),
                    ...((permActual || []).map((i) => i.name)),
                  ].filter(Boolean)))
                  if (unionNames.length === 0) {
                    return <div className="text-sm text-gray-500">Nessun permesso</div>
                  }
                  return unionNames.map((pName) => {
                    const isActive = effective.has(pName)
                    const item = (permRecommended || []).find((i) => i.name === pName) || (permActual || []).find((i) => i.name === pName)
                    const display = item?.display_name || pName
                    const description = item?.description
                    // Toggle acceso se presente in lista utente, spento altrimenti
                    const checked = isActive
                    return (
                      <label key={`${permUser.id}-${pName}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          <span className="font-medium">{display}</span>
                          {description && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{description}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${checked ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                          onClick={() => setConfirmOp({ permission: pName, label: display, type: checked ? 'block' : 'unblock' })}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </label>
                    )
                  })
                })()}
              </div>
            </div>
            {confirmOp && (
              <div className="px-6 pb-6">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-800 dark:text-gray-200 mb-3">
                    {confirmOp.type === 'block' ? (
                      <>Confermi il blocco del permesso <span className="font-medium">{confirmOp.label}</span> per questo utente?</>
                    ) : (
                      <>Confermi lo sblocco del permesso <span className="font-medium">{confirmOp.label}</span> per questo utente?</>
                    )}
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      onClick={() => setConfirmOp(null)}
                      disabled={confirmLoading}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-sm disabled:opacity-50"
                      onClick={async () => {
                        if (!permUser || !confirmOp) return
                        const userId = permUser.id
                        const perm = confirmOp.permission
                        setConfirmLoading(true)
                        try {
                          if (confirmOp.type === 'block') {
                            await blockUserPermissions(userId, [perm])
                            const next = new Set(permUser.permissions)
                            next.delete(perm)
                            const arr = Array.from(next)
                            setPermUser({ ...permUser, permissions: arr })
                            updateCachedUserPermissions(userId, arr)
                            toast.success('Permesso bloccato')
                          } else {
                            await unblockUserPermissions(userId, [perm])
                            const next = new Set(permUser.permissions)
                            next.add(perm)
                            const arr = Array.from(next)
                            setPermUser({ ...permUser, permissions: arr })
                            updateCachedUserPermissions(userId, arr)
                            toast.success('Permesso sbloccato')
                          }
                          setConfirmOp(null)
                        } catch (e) {
                          // Gli errori sono già tostate globalmente
                        } finally {
                          setConfirmLoading(false)
                        }
                      }}
                      disabled={confirmLoading}
                    >
                      {confirmLoading ? 'Conferma...' : 'Conferma'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                onClick={() => setPermModalOpen(false)}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Conferma eliminazione</h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">Stai per eliminare definitivamente l’utente <span className="font-medium">{deleteConfirm.name}</span>. L’operazione non è reversibile.</p>
              {(() => {
                const rawRoles = deleteConfirm.roles || []
                const normalized = rawRoles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
                const isEditorInChief = normalized.includes('editorinchief') || rawRoles.includes('EditorInChief') || rawRoles.includes('EDITOR_IN_CHIEF')
                const isJournalist = normalized.includes('journalist') || rawRoles.includes('Journalist') || rawRoles.includes('JOURNALIST')
                const isAdvertisingManager = normalized.includes('advertisingmanager') || rawRoles.includes('AdvertisingManager') || rawRoles.includes('ADVERTISING_MANAGER')
                if (isEditorInChief) {
                  return (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
                      <svg className="h-4 w-4 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                      <span>( saranno eliminati anche i giornalisti gestiti da questo editore)</span>
                    </div>
                  )
                }
                if (isJournalist) {
                  return (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
                      <svg className="h-4 w-4 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                      <span>( Tutti gli articoli di questo giornalista saranno associati all'utente <strong>editoria@editoriaresponsabile.com</strong> )</span>
                    </div>
                  )
                }
                if (isAdvertisingManager) {
                  return (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
                      <svg className="h-4 w-4 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                      <span>( Tutti  i banner creati da questo manager saranno associati all'utente <strong>editoria@editoriaresponsabile.com</strong> )</span>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}>Annulla</button>
              <button
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                onClick={async () => {
                  const target = deleteConfirm
                  if (!target) return
                  try {
                    setDeleteLoading(true)
                    await deleteUser(target.id)
                    toast.success('Utente eliminato')
                    setDeleteConfirm(null)
                    // Aggiorna lista
                    void searchUsers({ page: 1, per_page: perPage, search: (search.trim().length === 0 || search.trim().length >= 3) ? (search.trim() || undefined) : undefined, roles: (isEditorInChiefOnly ? (['Journalist'] as UserRoleFilter[]) : (roleFilter ? [roleFilter] : allowedRoleOptions)) })
                  } catch (e: any) {
                    // Gestione specifica degli errori per evitare doppi toast
                    if (e && typeof e.status === 'number') {
                      if (e.status === 403) {
                        toast.error('Non hai i permessi per questa operazione (oppure l’utente potrebbe avere altri ruoli che non sei autorizzato a gestire)')
                      } else if (e.status === 401) {
                        toast.error('Sessione scaduta o non autorizzato')
                      } else if (e.status >= 500) {
                        toast.error('Errore del server, riprova più tardi')
                      }
                    }
                  } finally {
                    setDeleteLoading(false)
                  }
                }}
                disabled={deleteLoading}
              >
                {deleteLoading && (
                  <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                )}
                {deleteLoading ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


