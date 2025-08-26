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
import { useArticles } from '@/hooks/use-articles'

export default function ArticlesPage() {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()

  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  const { results, loading, page, totalPages, total, setPage, search } = useArticles()

  const showAuthorFilter = hasAnyRole(['PUBLISHER', 'EDITOR_IN_CHIEF'])
  const isJournalist = hasAnyRole(['JOURNALIST'])

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(null)
  const [openCategoryModal, setOpenCategoryModal] = useState(false)
  const [openAuthorModal, setOpenAuthorModal] = useState(false)
  const [regionName, setRegionName] = useState('')
  const [provinceName, setProvinceName] = useState('')
  const [status, setStatus] = useState<string>('')
  const [authorId, setAuthorId] = useState<number | ''>('')
  const [authorName, setAuthorName] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'published_at' | 'priority' | 'title' | 'recenti' | 'popolari' | 'alfabetico'>('published_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [perPage, setPerPage] = useState(20)
  const lastKeyRef = useRef<string>('')

  const canCreate = hasPermission('create_article')
  const canEdit = hasPermission('edit_article')
  const canDelete = hasPermission('delete_article')

  useEffect(() => {
    const key = `${page}|${perPage}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    void search({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void search({
      page: 1,
      per_page: perPage,
      search: query || undefined,
      category_id: categoryId || undefined,
      region_name: regionName || undefined,
      province_name: provinceName || undefined,
      status: status || undefined,
      author_id: authorId || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
    })
  }

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])

  async function handleDelete(article: Article) {
    if (!canDelete) return
    const ok = window.confirm(`Confermi l'eliminazione dell'articolo #${article.id}?`)
    if (!ok) return
    try {
      await api.delete(API_ENDPOINTS.ARTICLES.DELETE(article.id))
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

  const formatDate = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  const columns: Array<DataTableColumn<Article>> = [
    {
      key: 'id',
      header: 'ID',
      cell: (a) => <span className="text-xs font-mono">#{a.id}</span>,
      tdClassName: 'px-6 py-4 whitespace-nowrap',
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
      key: 'status',
      header: 'Stato',
      cell: (a) => (
        <div className="h-14 flex items-center">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${a.status === 'published' ? 'bg-green-500' : a.status === 'draft' ? 'bg-gray-400' : a.status === 'review' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            />
            <span className="text-sm capitalize">{a.status || '-'}</span>
          </div>
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap align-middle',
    },
    {
      key: 'categories',
      header: 'Categoria',
      cell: (a) => <span className="text-sm truncate block max-w-[220px]">{a.categories && a.categories[0]?.title ? a.categories[0].title : '-'}</span>,
      tdClassName: 'px-6 py-4',
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
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={APP_ROUTES.DASHBOARD.ARTICLES.EDIT(a.id)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Modifica
            </Link>
          )}
          {canDelete && (
            <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(a)}>
              Elimina
            </Button>
          )}
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
  ]

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
        <div className="space-y-2 md:col-span-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ricerca</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titolo o testo" />
        </div>
        {/* Riga 1: Regione e Provincia (2 colonne) */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Regione</Label>
            <Input value={regionName} onChange={(e) => setRegionName(e.target.value)} placeholder="Es. Lombardia" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provincia</Label>
            <Input value={provinceName} onChange={(e) => setProvinceName(e.target.value)} placeholder="Es. Milano" />
          </div>
        </div>

        {/* Riga 2: Categoria e Stato (2 colonne) */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Select value={status || '__ALL__'} onValueChange={(v) => setStatus(v === '__ALL__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tutti</SelectItem>
                {/* Le opzioni devono combaciare con ArticleStatus::cases() lato API */}
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="review">Revisione</SelectItem>
                <SelectItem value="published">Pubblicato</SelectItem>
                <SelectItem value="archived">Archiviato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Riga 3: Autore (solo Publisher/EditorInChief), in 2 colonne */}
        {showAuthorFilter ? (
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordina per</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona criterio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published_at">Data pubblicazione</SelectItem>
              <SelectItem value="priority">Priorità</SelectItem>
              <SelectItem value="title">Titolo</SelectItem>
              <SelectItem value="recenti">Recenti</SelectItem>
              <SelectItem value="popolari">Popolari</SelectItem>
              <SelectItem value="alfabetico">Alfabetico</SelectItem>
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


