'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { APP_ROUTES } from '@/config/routes'
import { Button } from '@/components/ui/button'
import { FiltersCard } from '@/components/table/FiltersCard'
import { ResultsHeader } from '@/components/table/ResultsHeader'
import { PaginationBar } from '@/components/table/PaginationBar'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import CategorySelectModal from '@/components/forms/category-select-modal'
import AuthorSelectModal from '@/components/forms/author-select-modal'
import type { Article } from '@/hooks/use-articles'
import { fetchUltimissimiArticles, updateArticle } from '@/hooks/use-articles'
import { ARTICLE_STATUS_LABEL, statusColorClass } from '@/types/articles'
import type { ArticleStatus } from '@/types/articles'
import { useArticles } from '@/hooks/use-articles'
// import { fetchCategoryTree } from '@/hooks/use-categories'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useItalyGeo } from '@/hooks/use-italy-geo'

export default function ArticlesPage() {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()

  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)

  const { results, loading, page, totalPages, total, setPage, search } = useArticles()
  const { searchRegions, searchProvinces } = useItalyGeo()

  const showAuthorFilter = hasAnyRole(['PUBLISHER', 'EDITOR_IN_CHIEF'])
  const showPriorityColumn = hasAnyRole(['PUBLISHER'])

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(null)
  const [openCategoryModal, setOpenCategoryModal] = useState(false)
  const [openAuthorModal, setOpenAuthorModal] = useState(false)
  const [regionName, setRegionName] = useState('')
  const [provinceName, setProvinceName] = useState('')
  const [status, setStatus] = useState<'' | ArticleStatus>('')
  const [authorId, setAuthorId] = useState<number | ''>('')
  const [authorName, setAuthorName] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'published_at' | 'title'>('published_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [perPage, setPerPage] = useState(20)
  const lastKeyRef = useRef<string>('')
  const lastSubmittedFiltersRef = useRef<{ query?: string; categoryId?: number | ''; regionName?: string; provinceName?: string; status?: '' | ArticleStatus; authorId?: number | '' } | null>(null)

  // Rimosso fetch dell'albero categorie: non necessario per il filtro
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false)

  const canCreate = hasPermission('create_content')
  const canEdit = hasPermission('edit_content')
  const canDelete = hasPermission('delete_content')
  const canApprove = hasPermission('approve_articles')
  const canReject = hasPermission('reject_articles')
  const canPublish = hasPermission('publish_articles') || hasPermission('self_publish')

  useEffect(() => {
    const key = `${page}|${perPage}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    const f = lastSubmittedFiltersRef.current
    void search({
      page,
      per_page: perPage,
      search: f?.query || undefined,
      category_id: f?.categoryId || undefined,
      region_name: f?.regionName || undefined,
      province_name: f?.provinceName || undefined,
      status: (f?.status || undefined) as ArticleStatus | undefined,
      author_id: f?.authorId || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Evita doppie chiamate: se non siamo a pagina 1, imposta pagina e lascia che l'useEffect faccia la fetch
    if (page !== 1) {
      setPage(1)
      return
    }
    lastSubmittedFiltersRef.current = { query, categoryId, regionName, provinceName, status, authorId }
    void search({
      page: 1,
      per_page: perPage,
      search: query || undefined,
      category_id: categoryId || undefined,
      region_name: regionName || undefined,
      province_name: provinceName || undefined,
      status: (status || undefined) as ArticleStatus | undefined,
      author_id: authorId || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
    })
  }

  function applyCategoryFilter(catId: number, catTitle: string) {
    setSelectedCategoryTitle(catTitle)
    setCategoryId(catId)
    // Non avviare la ricerca automaticamente: eseguila solo con "Cerca"
    setPage(1)
  }

  function formatCategoryPathFromSlug(slug: string | undefined, title: string): string {
    if (!slug) return title
    const parts = String(slug).split('/').filter(Boolean)
    if (parts.length === 0) return title
    const pretty = parts.map((segment, idx) => {
      // Usa il title per l'ultimo segmento
      if (idx === parts.length - 1) return title
      // Title-case i segmenti intermedi (sostituisci i trattini con spazi)
      const s = segment.replace(/-/g, ' ')
      return s.replace(/\b\w/g, (c) => c.toUpperCase())
    })
    return pretty.join(' / ')
  }

  async function handleDelete(article: Article) {
    if (!canDelete) return
    const ok = window.confirm(`Confermi l'eliminazione dell'articolo #${article.id}?`)
    if (!ok) return
    try {
      await api.delete(API_ENDPOINTS.ARTICLES.DELETE(article.id), undefined, { suppressGlobalToasts: true })
      toast.success('Articolo eliminato')
      // refresh current page
      void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Eliminazione non riuscita')
      }
    }
  }

  const columns: Array<DataTableColumn<Article>> = [
    {
      key: 'id',
      header: 'ID',
      cell: (a) => (
        <div className="flex items-center gap-2">
          <span
            title={a.status ? ARTICLE_STATUS_LABEL[a.status] : undefined}
            className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass(a.status)}`}
          />
          <span className="text-xs font-mono">#{a.id}</span>
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap text-center',
    },
    {
      key: 'cover_preview',
      header: 'Cover',
      cell: (a) => (
        <div className="h-14 w-24 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {a.cover_preview ? (
            <img src={a.cover_preview} alt={`cover-${a.id}`} className="max-h-full max-w-full object-cover" />
          ) : (
            <div className="text-xs text-gray-500">—</div>
          )}
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'title',
      header: 'Titolo',
      cell: (a) => <span className="truncate block max-w-[360px]">{a.title}</span>,
      tdClassName: 'px-6 py-4',
    },
    {
      key: 'published_at',
      header: 'Pubblicazione',
      cell: (a) => <span className="text-sm">{a.published_at || '-'}</span>,
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'weekly_views',
      header: 'Vis. settimana',
      cell: (a) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{typeof a.weekly_views === 'number' ? a.weekly_views : '-'}</span>
      ),
      thClassName: 'px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-32',
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    ...(showPriorityColumn ? [{
      key: 'priority',
      header: 'Priorità',
      cell: (a: Article) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{typeof a.priority === 'number' ? a.priority : '-'}</span>
      ),
      thClassName: 'px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24',
      tdClassName: 'px-6 py-4 whitespace-nowrap text-center',
    }] : []),
    {
      key: 'categories',
      header: 'Categoria',
      cell: (a) => {
        const cats = Array.isArray(a.categories) ? a.categories : []
        if (cats.length === 0) return <span className="text-sm">-</span>
        return (
          <div className="flex flex-wrap gap-1 max-w-[360px]">
            {cats.map((c) => {
              const label = c.title || '-'
              const isChild = typeof c.slug === 'string' && c.slug.includes('/')
              const badgeClass = isChild
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 ring-1 ring-amber-300/60 dark:ring-amber-700/60'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-300/60 dark:ring-blue-700/60'
              const fullPath = isChild ? formatCategoryPathFromSlug(c.slug, label) : ''
              const badge = (
                <span
                  key={`cat-${a.id}-${c.id}`}
                  role="button"
                  onClick={() => applyCategoryFilter(c.id, label)}
                  className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full shadow-sm cursor-pointer ${badgeClass}`}
                >
                  {label}
                </span>
              )
              return isChild ? (
                <TooltipProvider key={`t-${a.id}-${c.id}`} delayDuration={0} skipDelayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>{badge}</TooltipTrigger>
                    <TooltipContent>{fullPath}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                badge
              )
            })}
          </div>
        )
      },
      tdClassName: 'px-6 py-4 text-center',
    },
    {
      key: 'author',
      header: 'Autore',
      cell: (a) => (
        <div className="h-14 flex items-center">
          <div className="flex items-center gap-3">
            {a.author?.avatar ? (
              <img src={a.author.avatar} alt={a.author.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
            ) : null}
            <span className="text-sm font-medium text-gray-900 dark:text-white">{a.author?.name || '-'}</span>
          </div>
        </div>
      ),
      tdClassName: 'px-6 py-4 align-middle',
    },
    {
      key: 'actions',
      header: 'Azioni',
      cell: (a) => (
        <RowActions article={a} />
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
  ]

  function RowActions({ article }: { article: Article }) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', onDocClick)
      return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

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
          aria-label={`Azioni articolo #${article.id}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </Button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 py-1">
            {/* Stato: Metti in revisione - disponibile per tutti */}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={async () => {
                setOpen(false)
                try {
                  await api.post(API_ENDPOINTS.ARTICLES.REVISION(article.id), {}, undefined, { suppressGlobalToasts: true })
                  toast.success('Articolo messo in revisione')
                  void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                } catch (error) {
                  if (error instanceof ApiError && error.status === 403) {
                    toast.error('Non sei autorizzato a fare questa operazione')
                  } else {
                    toast.error('Aggiornamento stato non riuscito')
                  }
                }
              }}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('revision')}`} />
              Metti in revisione
            </button>

            {/* Stato: Approva - visibile solo con permesso */}
            {canApprove && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await api.post(API_ENDPOINTS.ARTICLES.APPROVE(article.id), {}, undefined, { suppressGlobalToasts: true })
                    toast.success('Articolo approvato')
                    void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Aggiornamento stato non riuscito')
                    }
                  }
                }}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('approved')}`} />
                Approva
              </button>
            )}

            {/* Stato: Rifiuta - visibile solo con permesso */}
            {canReject && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await api.post(API_ENDPOINTS.ARTICLES.REJECT(article.id), {}, undefined, { suppressGlobalToasts: true })
                    toast.success('Articolo rifiutato')
                    void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Aggiornamento stato non riuscito')
                    }
                  }
                }}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('rejected')}`} />
                Rifiuta
              </button>
            )}

            {/* Stato: Pubblica - visibile solo con permesso publish_article */}
            {canPublish && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await api.post(API_ENDPOINTS.ARTICLES.PUBLISH(article.id), {}, undefined, { suppressGlobalToasts: true })
                    toast.success('Articolo pubblicato')
                    void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Aggiornamento stato non riuscito')
                    }
                  }
                }}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('published')}`} />
                Pubblica
              </button>
            )}

            {/* Stato: Depubblica - visibile solo con permesso publish_article */}
            {canPublish && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await api.post(API_ENDPOINTS.ARTICLES.UNPUBLISH(article.id), {}, undefined, { suppressGlobalToasts: true })
                    toast.success('Articolo depubblicato')
                    void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Aggiornamento stato non riuscito')
                    }
                  }
                }}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('unpublished')}`} />
                Depubblica
              </button>
            )}

            {/* Stato: Archivia - visibile solo con permesso publish_article */}
            {canPublish && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={async () => {
                  setOpen(false)
                  try {
                    await api.post(API_ENDPOINTS.ARTICLES.ARCHIVE(article.id), {}, undefined, { suppressGlobalToasts: true })
                    toast.success('Articolo archiviato')
                    void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Aggiornamento stato non riuscito')
                    }
                  }
                }}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('archived')}`} />
                Archivia
              </button>
            )}

            {/* Stato: Rendi Bozza - disponibile per tutti */}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={async () => {
                setOpen(false)
                try {
                  await api.post(API_ENDPOINTS.ARTICLES.DRAFT(article.id), {}, undefined, { suppressGlobalToasts: true })
                  toast.success('Articolo reso bozza')
                  void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
                } catch (error) {
                  if (error instanceof ApiError && error.status === 403) {
                    toast.error('Non sei autorizzato a fare questa operazione')
                  } else {
                    toast.error('Aggiornamento stato non riuscito')
                  }
                }
              }}
            >
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColorClass('draft')}`} />
              Rendi Bozza
            </button>

            {article.status === 'published' && article.show_link ? (
              <a
                href={article.show_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0 0L10 21l-7-7L14 3z" /></svg>
                Vedi su Editoria
              </a>
            ) : null}
            {canEdit && (
              <Link
                href={APP_ROUTES.DASHBOARD.ARTICLES.EDIT(article.id)}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifica
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                onClick={() => { setOpen(false); void handleDelete(article) }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Elimina
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Articoli"
        subtitle="Gestisci gli articoli filtrando per titolo, categoria e data"
        icon={(
          <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6M9 16h6" />
          </svg>
        )}
      />

      <FiltersCard onSubmit={onSearchSubmit} isLoading={loading} gridCols={3} submitLabel="Cerca" submitFullWidth={true} submitUseEmptyLabel={true}>
        {/* Riga 1: Tutti i filtri */}
        <div className="md:col-span-3 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ricerca</Label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titolo o testo" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Regione</Label>
              <div className="relative">
                <Input
                  value={regionName}
                  onChange={(e) => { setRegionName(e.target.value); setProvinceName('') }}
                  onFocus={() => setShowRegionDropdown(true)}
                  onBlur={() => setTimeout(() => setShowRegionDropdown(false), 100)}
                  placeholder="Es. Lazio"
                />
                {showRegionDropdown && regionName && searchRegions(regionName).slice(0, 6).length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
                    {searchRegions(regionName).slice(0, 6).map((r) => (
                      <button
                        key={r.name}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => { setRegionName(r.name); setProvinceName(''); setShowRegionDropdown(false) }}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provincia</Label>
              <div className="relative">
                <Input
                  value={provinceName}
                  onChange={(e) => { setProvinceName(e.target.value); setShowProvinceDropdown(true) }}
                  onFocus={() => setShowProvinceDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 100)}
                  placeholder="Es. Frosinone"
                />
                {showProvinceDropdown && provinceName && searchProvinces(provinceName, regionName || undefined).slice(0, 6).length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
                    {searchProvinces(provinceName, regionName || undefined).slice(0, 6).map((p) => (
                      <button
                        key={`${p.name}-${p.abbreviation || ''}`}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hoverbg-gray-800"
                        onClick={() => { setProvinceName(p.name); if (!regionName && p.regionName) setRegionName(p.regionName); setShowProvinceDropdown(false) }}
                      >
                        {p.name}{p.abbreviation ? ` (${p.abbreviation})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</Label>
              <div className="relative">
                <Input
                  readOnly
                  value={selectedCategoryTitle ? selectedCategoryTitle : (categoryId ? `ID ${categoryId}` : '')}
                  placeholder="Cerca categoria..."
                  onClick={() => setOpenCategoryModal(true)}
                  onFocus={() => setOpenCategoryModal(true)}
                />
                {categoryId ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => { setCategoryId(''); setSelectedCategoryTitle(null) }}
                    aria-label="Rimuovi categoria selezionata"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stato</Label>
              <Select value={status || '__ALL__'} onValueChange={(v) => setStatus(v === '__ALL__' ? '' : (v as ArticleStatus))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tutti</SelectItem>
                  {/* Le opzioni devono combaciare con ArticleStatus::cases() lato API */}
                  <SelectItem value="draft">{ARTICLE_STATUS_LABEL.draft}</SelectItem>
                  <SelectItem value="published">{ARTICLE_STATUS_LABEL.published}</SelectItem>
                  <SelectItem value="revision">{ARTICLE_STATUS_LABEL.revision}</SelectItem>
                  <SelectItem value="unpublished">{ARTICLE_STATUS_LABEL.unpublished}</SelectItem>
                  <SelectItem value="archived">{ARTICLE_STATUS_LABEL.archived}</SelectItem>
                  <SelectItem value="approved">{ARTICLE_STATUS_LABEL.approved}</SelectItem>
                  <SelectItem value="rejected">{ARTICLE_STATUS_LABEL.rejected}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showAuthorFilter ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Autore</Label>
                <div className="relative">
                  <Input
                    readOnly
                    value={authorName ? authorName : (authorId ? `ID ${authorId}` : '')}
                    placeholder="Cerca autore..."
                    onClick={() => setOpenAuthorModal(true)}
                    onFocus={() => setOpenAuthorModal(true)}
                  />
                  {authorId ? (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => { setAuthorId(''); setAuthorName(null) }}
                      aria-label="Rimuovi autore selezionato"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  ) : null}
                </div>
              </div>
              <div />
            </div>
          ) : null}
        </div>

        {/* Riga 2: Ordinamento e pulsante Cerca */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordina per</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona criterio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published_at">Data pubblicazione</SelectItem>
              <SelectItem value="title">Titolo</SelectItem>
              {showPriorityColumn && <SelectItem value="priority">Priorità</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Direzione</Label>
          <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as 'asc' | 'desc')}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona direzione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Decrescente</SelectItem>
              <SelectItem value="asc">Crescente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FiltersCard>

      {/* Gestione articoli "Ultimissimi" (Publisher) */}
      <UltimissimiArticlesManager />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ResultsHeader
          title="Risultati"
          subtitle={`${total} risultati`}
          actions={(
            canCreate ? (
              <Link href={APP_ROUTES.DASHBOARD.ARTICLES.NEW} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuovo articolo
              </Link>
            ) : null
          )}
          rightAside={(
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-end gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" /> {ARTICLE_STATUS_LABEL.approved}</div>
                <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> {ARTICLE_STATUS_LABEL.rejected}</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" /> {ARTICLE_STATUS_LABEL.revision}</div>
                </div>
                <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> {ARTICLE_STATUS_LABEL.published}</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" /> {ARTICLE_STATUS_LABEL.unpublished}</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" /> {ARTICLE_STATUS_LABEL.draft}</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-500" /> {ARTICLE_STATUS_LABEL.archived}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800 ring-1 ring-blue-300/60 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-700/60">Categoria principale</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-300/60 dark:bg-amber-900 dark:text-amber-200 dark:ring-amber-700/60">Categoria figlia</span>
                </div>
              </div>
            </div>
          )}
        />
        <DataTable<Article>
          data={Array.isArray(results) ? results : []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Caricamento articoli..."
          emptyTitle="Nessun articolo trovato"
          emptySubtitle="Prova a regolare i filtri"
        />
      </div>

      <PaginationBar
        total={total}
        currentPage={page}
        totalPages={totalPages}
        perPage={perPage}
        setPerPage={setPerPage}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={() => setPage(Math.max(1, page - 1))}
        onNext={() => setPage(Math.min(totalPages, page + 1))}
      />
      <CategorySelectModal
        open={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        onSelect={(c) => { setCategoryId(c.id); setSelectedCategoryTitle(c.title) }}
      />
      <AuthorSelectModal
        open={openAuthorModal}
        onClose={() => setOpenAuthorModal(false)}
        onSelect={(u) => { setAuthorId(u.id); setAuthorName(u.fullName) }}
      />
    </div>
  )
}


function UltimissimiArticlesManager() {
  const { hasAnyRole } = useAuth()
  const isPublisher = hasAnyRole(['PUBLISHER'])
  const [ordered, setOrdered] = useState<Article[]>([])
  const MAX_SLOTS = 10
  const [slots, setSlots] = useState<Array<Article | null>>(Array(MAX_SLOTS).fill(null))
  const [slotInputs, setSlotInputs] = useState<string[]>(Array(MAX_SLOTS).fill(''))
  const [loading, setLoading] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)

  useEffect(() => {
    if (!isPublisher) return
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetchUltimissimiArticles(10)
        const payload: any = res as any
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.data)
              ? payload.data.data
              : []
        const arr: Article[] = Array.isArray(list) ? list : []
        if (!active) return
        setOrdered(arr)
        const nextSlots = Array(MAX_SLOTS).fill(null) as Array<Article | null>
        arr.forEach((a) => {
          const ordNum = Number((a as any).recent_order)
          const ord = Number.isFinite(ordNum) ? ordNum : null
          if (ord && ord >= 1 && ord <= MAX_SLOTS) {
            nextSlots[ord - 1] = a
          }
        })
        if (!nextSlots.some(Boolean)) {
          for (let i = 0; i < Math.min(arr.length, MAX_SLOTS); i++) {
            nextSlots[i] = arr[i]
          }
        }
        setSlots(nextSlots)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [isPublisher])

  async function setArticleOrder(article: Article, recent_order: number) {
    await updateArticle(article.id, { recent_order })
  }

  async function onRemove(article: Article) {
    const prev = ordered
    setSlots((prevSlots) => prevSlots.map((s) => (s && s.id === article.id ? null : s)))
    setOrdered((list) => list.filter((a) => a.id !== article.id))
    setOrderDirty(true)
    try {
      await setArticleOrder(article, 0)
    } catch {
      setOrdered(prev)
    }
  }

  async function onAddAt(slotIndex: number) {
    const idStr = slotInputs[slotIndex]
    const idNum = Number(idStr)
    if (!idNum || Number.isNaN(idNum)) return
    if (ordered.some((a) => a.id === idNum)) {
      toast.error('Questo articolo è già presente nella lista')
      return
    }
    const desiredOrder = slotIndex + 1
    try {
      await updateArticle(idNum, { recent_order: desiredOrder })
      // refresh
      const res = await fetchUltimissimiArticles(10)
      const payload: any = res as any
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : []
      const arr: Article[] = Array.isArray(list) ? list : []
      setOrdered(arr)
      const nextSlots = Array(MAX_SLOTS).fill(null) as Array<Article | null>
      arr.forEach((a) => {
        const ordNum = Number((a as any).recent_order)
        const ord = Number.isFinite(ordNum) ? ordNum : null
        if (ord && ord >= 1 && ord <= MAX_SLOTS) {
          nextSlots[ord - 1] = a
        }
      })
      if (!nextSlots.some(Boolean)) {
        for (let i = 0; i < Math.min(arr.length, MAX_SLOTS); i++) {
          nextSlots[i] = arr[i]
        }
      }
      setSlots(nextSlots)
      setSlotInputs((prev) => prev.map((v, i) => (i === slotIndex ? '' : v)))
    } catch {}
  }

  // Drag & drop: consenti spostamento solo verso slot vuoti, senza shift degli altri

  async function onSaveOrder() {
    const prev = ordered
    try {
      for (let i = 0; i < slots.length; i++) {
        const art = slots[i]
        if (!art) continue
        const desired = i + 1
        const current = Number((art as any).recent_order) || 0
        if (current !== desired) {
          await setArticleOrder(art, desired)
        }
      }
      const res = await fetchUltimissimiArticles(10)
      const payload: any = res as any
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : []
      const arr: Article[] = Array.isArray(list) ? list : []
      setOrdered(arr)
      const nextSlots = Array(MAX_SLOTS).fill(null) as Array<Article | null>
      arr.forEach((a) => {
        const ordNum = Number((a as any).recent_order)
        const ord = Number.isFinite(ordNum) ? ordNum : null
        if (ord && ord >= 1 && ord <= MAX_SLOTS) {
          nextSlots[ord - 1] = a
        }
      })
      if (!nextSlots.some(Boolean)) {
        for (let i = 0; i < Math.min(arr.length, MAX_SLOTS); i++) {
          nextSlots[i] = arr[i]
        }
      }
      setSlots(nextSlots)
      setOrderDirty(false)
      toast.success('Ordine aggiornato')
    } catch {
      setOrdered(prev)
      toast.error('Aggiornamento ordine non riuscito')
    }
  }

  if (!isPublisher) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Articoli “Ultimissimi” (ordinati)</h3>
        {orderDirty && (
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onSaveOrder} disabled={loading} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold">Salva ordine</Button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Caricamento...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {slots.map((a, idx) => (
            <div
              key={a ? a.id : `slot-${idx}`}
              className={`rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900 text-sm ${draggingIndex===idx ? 'ring-2 ring-amber-500' : ''}`}
              draggable
              onDragStart={() => a && setDraggingIndex(idx)}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={() => {
                if (draggingIndex!==null && draggingIndex!==idx && !slots[idx]) {
                  setSlots((prev) => {
                    const arr = [...prev]
                    arr[idx] = prev[draggingIndex]
                    arr[draggingIndex] = null
                    return arr
                  })
                  setOrderDirty(true)
                }
                setDraggingIndex(null)
              }}
              onDragEnd={() => setDraggingIndex(null)}
            >
              {a ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-600 text-white text-xs font-bold">{Number.isFinite(Number((a as any).recent_order)) ? Number((a as any).recent_order) : (idx+1)}</div>
                    <div className="font-medium truncate max-w-[180px]" title={a.title}>{a.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">#{a.id}</span>
                    <Button type="button" variant="destructive" size="sm" onClick={() => { void onRemove(a) }}>Rimuovi</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-300 text-gray-700 text-xs font-bold">{idx+1}</div>
                    <div className="font-medium text-gray-500">Slot vuoto</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={slotInputs[idx]} onChange={(e) => setSlotInputs((prev) => prev.map((v, i) => i===idx ? e.target.value : v))} placeholder="ID" className="w-20" />
                    <Button type="button" size="sm" onClick={() => { void onAddAt(idx) }}>Aggiungi</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


