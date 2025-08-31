'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { searchCategories } from '@/hooks/use-categories'
import type { Article } from '@/hooks/use-articles'
import { ARTICLE_STATUS_LABEL, statusColorClass } from '@/types/articles'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import { toast } from 'sonner'

type ArticleSelectModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (article: Article) => void
  usePublicFilter?: boolean
}

export default function ArticleSelectModal({ open, onClose, onSelect, usePublicFilter = false }: ArticleSelectModalProps) {
  const [results, setResults] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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
    void doSearch(1, { initial: true })
  }, [open])

  const doSearch = useCallback(async (pageNum: number = 1, opts?: { initial?: boolean }) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (query) qs.append('search', query)
      if (categoryId) qs.append('category_id', String(categoryId))
      const effectiveSort = (query || categoryId) ? (sortBy || undefined) : (sortBy || (opts?.initial ? 'recenti' : undefined))
      if (effectiveSort) qs.append('sort_by', String(effectiveSort))
      qs.append('per_page', '10')
      qs.append('page', String(pageNum))

      const endpoint = usePublicFilter ? API_ENDPOINTS.ARTICLES.FILTER : API_ENDPOINTS.ARTICLES.FILTER_PUBLIC
      const res = await api.get<any>(`${endpoint}?${qs.toString()}`)

      const d = res?.data
      let list: Article[] = []
      let lastPageNum = 1
      if (Array.isArray(d)) {
        list = d as Article[]
      } else if (Array.isArray(d?.data)) {
        list = d.data as Article[]
        lastPageNum = d.last_page ?? d.meta?.last_page ?? 1
      } else if (Array.isArray(d?.data?.data)) {
        list = d.data.data as Article[]
        lastPageNum = d.data.last_page ?? 1
      }
      setResults(Array.isArray(list) ? list : [])
      setTotalPages(lastPageNum)
      setPage(pageNum)
    } catch (error) {
      if (error instanceof ApiError && error.status === 500) {
        toast.error('Qualcosa è andato storto. Riprova più tardi.')
      }
      setResults([])
      setTotalPages(1)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }, [query, categoryId, sortBy, usePublicFilter])

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
                  <SelectItem value="published_at">Data pubblicazione</SelectItem>
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
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.title}</div>
                        <div className="text-xs text-gray-500">
                          ID: {a.id}{(() => { const d = formatDate(a.published_at); return d ? ` • Pubblicato: ${d}` : '' })()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">
                          Autore: {a.author?.name || '-'}{(() => { const c = Array.isArray(a.categories) ? a.categories[0] : undefined; return c ? ` • Categoria: ${c.title}` : '' })()} {typeof a.weekly_views === 'number' ? ` • Visite settimanali: ${a.weekly_views}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {a.status ? (
                          <span
                            title={ARTICLE_STATUS_LABEL[a.status]}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${(() => {
                              const color = statusColorClass(a.status)
                              // Map dot color to pill bg/text roughly
                              if (color.includes('green')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ring-green-300/60 dark:ring-green-700/60'
                              if (color.includes('gray') || color.includes('zinc') || color.includes('slate')) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 ring-gray-300/60 dark:ring-gray-700/60'
                              if (color.includes('amber')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 ring-amber-300/60 dark:ring-amber-700/60'
                              if (color.includes('red')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ring-red-300/60 dark:ring-red-700/60'
                              if (color.includes('blue')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-blue-300/60 dark:ring-blue-700/60'
                              return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 ring-gray-300/60 dark:ring-gray-700/60'
                            })()}`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full ${statusColorClass(a.status)}`} />
                            {ARTICLE_STATUS_LABEL[a.status]}
                          </span>
                        ) : null}
                        {a.show_link ? (
                          <a
                            href={a.show_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Vedi articolo
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0 0L10 21l-7-7L14 3z" /></svg>
                          </a>
                        ) : null}
                        <div className="shrink-0 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">Articolo</div>
                      </div>
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
                onClick={() => void doSearch(page - 1)}
              >
                Prec
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => void doSearch(page + 1)}
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


