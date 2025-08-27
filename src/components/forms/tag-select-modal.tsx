'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type Tag = { id: number; name: string }

type TagSelectModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (tag: Tag) => void
}

export default function TagSelectModal({ open, onClose, onSelect }: TagSelectModalProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Tag[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!open) return
    setResults([])
    setPage(1)
    setTotalPages(1)
    setQuery('')
    setHasSearched(false)
  }, [open])

  async function runSearch(p = 1) {
    if (!open) return
    const q = query.trim()
    if (!q || q.length < 2) {
      setResults([])
      setPage(1)
      setTotalPages(1)
      setHasSearched(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(p))
      params.append('per_page', '10')
      params.append('search', q)
      const res = await api.get<any>(`/tags/search?${params.toString()}`)
      const d = res?.data
      const list = Array.isArray(d?.data) ? d.data : []
      const lastPage = d?.last_page || 1
      setResults(list.map((t: any) => ({ id: t.id, name: t.title })))
      setTotalPages(lastPage)
      setPage(p)
      setHasSearched(true)
    } catch {
      setResults([])
      setTotalPages(1)
      setPage(1)
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const emptyState = useMemo(() => !loading && results.length === 0, [loading, results])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Seleziona tag</h2>
            <p className="text-xs text-gray-500">Digita almeno 2 caratteri e premi Cerca</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={onClose} aria-label="Chiudi">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Cerca tag</label>
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(e) => { setQuery(e.target.value); setHasSearched(false) }} onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(1) }} placeholder="Digita per cercare..." />
              <Button type="button" variant="secondary" onClick={() => void runSearch(1)}>Cerca</Button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 mt-2">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && <li className="p-4 text-sm text-gray-500">Caricamento...</li>}
              {emptyState && (
                <li className="p-4 text-sm text-gray-500">
                  {query.trim().length < 2
                    ? 'Digita almeno 2 caratteri per cercare'
                    : hasSearched
                      ? 'Nessun risultato'
                      : 'Premi Cerca per avviare la ricerca'}
                </li>
              )}
              {!loading && results.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(t); onClose() }}
                    className="w-full text-left p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                      </div>
                      <div className="shrink-0 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">#{t.id}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">Pagina {page} di {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => void runSearch(page - 1)}>Prec</Button>
              <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => void runSearch(page + 1)}>Succ</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
