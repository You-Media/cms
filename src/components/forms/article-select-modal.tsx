'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { searchCategories } from '@/hooks/use-categories'
import { useArticles, type Article } from '@/hooks/use-articles'

type ArticleSelectModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (article: Article) => void
}

export default function ArticleSelectModal({ open, onClose, onSelect }: ArticleSelectModalProps) {
  const { results, loading, search, page, totalPages, setPage } = useArticles()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [categoryResults, setCategoryResults] = useState<Array<{ id: number; title: string; slug: string; parent_title?: string | null }>>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(null)

  // Initial fetch on open
  useEffect(() => {
    if (!open) return
    search({ sort_by: 'recenti', per_page: 10, page: 1 })
    setPage(1)
  }, [open, search, setPage])

  const doSearch = useCallback((pageNum: number = 1) => {
    const effectiveSort = (query || categoryId) ? (sortBy || undefined) : (sortBy || 'recenti')
    search({
      search: query || undefined,
      sort_by: effectiveSort || undefined,
      category_id: categoryId || undefined,
      per_page: 10,
      page: pageNum,
    })
    setPage(pageNum)
  }, [query, sortBy, categoryId, search, setPage])

  const runCategorySearch = useCallback(async () => {
    if (!open) return
    if (!categoryQuery.trim() || categoryQuery.trim().length < 2) {
      setCategoryResults([])
      return
    }
    setCategoryLoading(true)
    try {
      const res = await searchCategories({ search: categoryQuery, per_page: 5, page: 1 })
      const items = res.data.data.map((c) => ({ id: c.id, title: c.title, slug: c.slug, parent_title: c.parent?.title || null }))
      setCategoryResults(items)
    } catch {
      setCategoryResults([])
    } finally {
      setCategoryLoading(false)
    }
  }, [open, categoryQuery])

  const emptyState = useMemo(() => !loading && results.length === 0, [loading, results])

  function formatDate(input?: string) {
    if (!input) return ''
    const m = input.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const [, y, mo, d] = m
      return `${d}/${mo}/${y}`
    }
    const dt = new Date(input)
    if (Number.isNaN(dt.getTime())) return ''
    try {
      return dt.toLocaleDateString('it-IT')
    } catch {
      return typeof input === 'string' ? input.slice(0, 10) : ''
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Seleziona articolo</h2>
            <p className="text-xs text-gray-500">Usa i filtri per trovare l'articolo giusto</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={onClose} aria-label="Chiudi">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cerca titolo</label>
              <div className="flex items-center gap-2">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch(1) }} placeholder="Digita per cercare..." />
                <Button type="button" variant="secondary" onClick={() => doSearch(1)}>Cerca</Button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Categoria</label>
              {!selectedCategoryTitle ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runCategorySearch() }} placeholder="Cerca categoria..." />
                    <Button type="button" variant="secondary" onClick={runCategorySearch}>Cerca</Button>
                  </div>
                  {(categoryLoading || categoryResults.length > 0) && (
                    <div className="mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categoryLoading && <li className="p-2 text-xs text-gray-500">Caricamento...</li>}
                        {!categoryLoading && categoryResults.length === 0 && (
                          <li className="p-2 text-xs text-gray-500">Nessun risultato</li>
                        )}
                        {!categoryLoading && categoryResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryId(c.id)
                                setSelectedCategoryTitle(c.title)
                                setCategoryResults([])
                              }}
                              className="w-full text-left p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                              <div className="text-xs font-medium">{c.title}</div>
                              <div className="text-[10px] text-gray-500 flex items-center gap-2">
                                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{c.slug}</code>
                                <span className="truncate">Genitore: {c.parent_title || 'Nessuno'}</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-2">
                  <div className="text-xs">
                    <span className="text-gray-500">Filtro:</span> <span className="font-medium">{selectedCategoryTitle}</span>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setCategoryId(''); setSelectedCategoryTitle(null); setCategoryQuery('') }}>Rimuovi</Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Ordina per</label>
              <Select value={sortBy || '__NONE__'} onValueChange={(v) => setSortBy(v === '__NONE__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">Nessuno</SelectItem>
                  <SelectItem value="recenti">Recenti</SelectItem>
                  <SelectItem value="popolari">Popolari</SelectItem>
                  <SelectItem value="alfabetico">Alfabetico</SelectItem>
                  <SelectItem value="published_at">Data pubblicazione</SelectItem>
                  <SelectItem value="priority">Priorità</SelectItem>
                  <SelectItem value="title">Titolo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 mt-2">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && <li className="p-4 text-sm text-gray-500">Caricamento...</li>}
              {emptyState && <li className="p-4 text-sm text-gray-500">Nessun risultato</li>}
              {!loading && results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(a); onClose() }}
                    className="w-full text-left p-4 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.title}</div>
                        <div className="text-xs text-gray-500">ID: {a.id}{(() => { const d = formatDate(a.published_at); return d ? ` • Pubblicato: ${d}` : '' })()}</div>
                      </div>
                      <div className="shrink-0 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">Articolo</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">Pagina {page} di {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => doSearch(page - 1)}
              >
                Prec
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => doSearch(page + 1)}
              >
                Succ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


