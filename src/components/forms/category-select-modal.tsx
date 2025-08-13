'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchCategories } from '@/hooks/use-categories'
import type { Category } from '@/types/categories'

type CategorySelectModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (category: Category) => void
}

export default function CategorySelectModal({ open, onClose, onSelect }: CategorySelectModalProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Category[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!open) return
    // initial fetch
    void (async () => {
      setLoading(true)
      try {
        const res = await searchCategories({ search: null, per_page: 10, page: 1 })
        setResults(res.data.data)
        setTotalPages(res.data.last_page)
      } catch {
        setResults([])
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    })()
  }, [open])

  async function runSearch(p = 1) {
    if (!open) return
    if (query.trim() && query.trim().length < 2) return
    setLoading(true)
    try {
      const res = await searchCategories({ search: query ? query : null, per_page: 10, page: p })
      setResults(res.data.data)
      setTotalPages(res.data.last_page)
      setPage(p)
    } catch {
      setResults([])
      setTotalPages(1)
      setPage(1)
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
            <h2 className="text-lg font-semibold">Seleziona categoria</h2>
            <p className="text-xs text-gray-500">Cerca e scegli la categoria</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={onClose} aria-label="Chiudi">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Cerca titolo</label>
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(e) => { setQuery(e.target.value) }} onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(1) }} placeholder="Digita per cercare..." />
              <Button type="button" variant="secondary" onClick={() => void runSearch(1)}>Cerca</Button>
            </div>
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 mt-2">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && <li className="p-4 text-sm text-gray-500">Caricamento...</li>}
              {emptyState && <li className="p-4 text-sm text-gray-500">Nessun risultato</li>}
              {!loading && results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(c); onClose() }}
                    className="w-full text-left p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.title}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{c.slug}</code>
                          <span className="truncate">Genitore: {c.parent?.title || 'Nessuno'}</span>
                        </div>
                      </div>
                      <div className="shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">#{c.id}</div>
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


