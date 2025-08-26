'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUsers, type UsersSearchRow, type UserRoleFilter } from '@/hooks/use-users'

type AuthorSelectModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (user: { id: number; fullName: string; email?: string }) => void
  roles?: UserRoleFilter[]
}

export default function AuthorSelectModal({ open, onClose, onSelect, roles = ['Journalist'] }: AuthorSelectModalProps) {
  const { rows, loading, currentPage, totalPages, searchUsers } = useUsers()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    void searchUsers({ page: 1, per_page: 10, search: '', roles })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Rimosso live-search su digitazione: la ricerca parte solo su click/Enter

  const emptyState = useMemo(() => !loading && rows.length === 0, [loading, rows])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Seleziona autore</h2>
            <p className="text-xs text-gray-500">Cerca per nome o email</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={onClose} aria-label="Chiudi">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Cerca autore</label>
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void searchUsers({ page: 1, per_page: 10, search: query, roles }) } }}
                placeholder="Digita per cercare..."
              />
              <Button type="button" variant="secondary" onClick={() => void searchUsers({ page: 1, per_page: 10, search: query, roles })}>Cerca</Button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 mt-2">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && <li className="p-4 text-sm text-gray-500">Caricamento...</li>}
              {emptyState && <li className="p-4 text-sm text-gray-500">Nessun risultato</li>}
              {!loading && rows.map((u: UsersSearchRow) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect({ id: u.id, fullName: u.fullName, email: u.email }); onClose() }}
                    className="w-full text-left p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <div className="flex items-center gap-3">
                      {u.profilePhoto ? (
                        <img src={u.profilePhoto} alt={u.fullName} className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">{u.fullName.slice(0,1)}</div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{u.fullName || '-'}</div>
                        <div className="text-xs text-gray-500 truncate">{u.email}</div>
                      </div>
                      <div className="ml-auto shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">#{u.id}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">Pagina {currentPage} di {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" disabled={currentPage <= 1} onClick={() => void searchUsers({ page: currentPage - 1, per_page: 10, search: query, roles })}>Prec</Button>
              <Button type="button" variant="secondary" disabled={currentPage >= totalPages} onClick={() => void searchUsers({ page: currentPage + 1, per_page: 10, search: query, roles })}>Succ</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


