'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { searchCategories, deleteCategory, createCategory, updateCategory } from '@/hooks/use-categories'
import type { Category } from '@/types/categories'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FiltersCard } from '@/components/table/FiltersCard'
import { ResultsHeader } from '@/components/table/ResultsHeader'
import { PaginationBar } from '@/components/table/PaginationBar'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { toast } from 'sonner'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { ApiError } from '@/lib/api'

export default function CategoriesPage() {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()

  const [search, setSearch] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [perPage, setPerPage] = useState<number>(15)
  const [page, setPage] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [lastPage, setLastPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)

  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editParentId, setEditParentId] = useState<string>('')
  const [editParentSearch, setEditParentSearch] = useState<string>('')
  const [editParentSearchResults, setEditParentSearchResults] = useState<Category[]>([])
  const [isSearchingParentEdit, setIsSearchingParentEdit] = useState<boolean>(false)
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false)

  // Form state (create)
  const [newTitle, setNewTitle] = useState<string>('')
  const [newParentId, setNewParentId] = useState<string>('')
  const [parentSearch, setParentSearch] = useState<string>('')
  const [parentSearchResults, setParentSearchResults] = useState<Category[]>([])
  const [isSearchingParent, setIsSearchingParent] = useState<boolean>(false)
  const lastParamsRef = useRef<string>('')

  const siteAllowed = selectedSite === 'editoria'
  const rolesAllowed = hasAnyRole(['ADMIN', 'Editor', 'EditorInChief'])
  const canManageCategories = hasPermission('manage_categories')
  const canManageSubcategories = hasPermission('manage_subcategories')

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < lastPage, [page, lastPage])

  useEffect(() => {
    if (!siteAllowed) return
    const key = `${page}|${perPage}|${search}|${parentId}`
    if (lastParamsRef.current === key) return
    lastParamsRef.current = key
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  async function loadData() {
    setIsLoading(true)
    try {
      const res = await searchCategories({
        page,
        per_page: perPage,
        search: search || null,
        parent_id: parentId ? Number(parentId) : null,
      })
      setCategories(res.data.data)
      setCurrentPage(res.data.current_page)
      setLastPage(res.data.last_page)
      setTotal(res.data.total)
    } catch (error) {
      toast.error('Errore durante il caricamento delle categorie')
    } finally {
      setIsLoading(false)
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    void loadData()
  }

  function onEdit(category: Category) {
    setEditCategory(category)
    setEditTitle(category.title)
    setEditParentId(category.parent_id ? String(category.parent_id) : '')
    setEditParentSearch(category.parent?.title || '')
    setIsEditOpen(true)
  }

  async function onDelete(category: Category) {
    const count = category.articles_count ?? 0
    if (count > 0) {
      toast.error('Impossibile eliminare: la categoria ha articoli collegati')
      return
    }
    const ok = window.confirm(`Confermi l'eliminazione di "${category.title}"?`)
    if (!ok) return

    try {
      await deleteCategory(category.id)
      toast.success('Categoria eliminata con successo')
      // refresh
      void loadData()
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
      toast.error('Eliminazione non riuscita')
      }
    }
  }

  if (!siteAllowed) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Categorie</h1>
        <p className="text-sm text-gray-500 mt-2">Risorsa non disponibile per il sito selezionato.</p>
      </div>
    )
  }

  if (!rolesAllowed) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <PageHeaderCard
        title="Categorie"
        subtitle="Gestisci e organizza le categorie di editoriaresponsabile.com"
        icon={(
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5m14 14H5" />
          </svg>
        )}
      />

      {/* Search and Filters Card */}
      <FiltersCard onSubmit={onSearchSubmit} isLoading={isLoading} gridCols={3} submitUseEmptyLabel={true}>
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300">Ricerca per titolo</Label>
          <div className="relative">
            <Input 
              id="search" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Cerca nelle categorie..." 
              className="pl-10"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent" className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria genitore</Label>
          <div className="relative">
            <Input 
              id="parent" 
              value={parentId} 
              onChange={(e) => setParentId(e.target.value)} 
              placeholder="ID categoria (es. 1)" 
              className="pl-10"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
          </div>
        </div>
      </FiltersCard>

      {/* Results Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ResultsHeader
          title="Risultati"
          subtitle={total > 0 ? `${total} ${total === 1 ? 'categoria trovata' : 'categorie trovate'}` : 'Nessun risultato'}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => window.location.assign('/dashboard/categories/tree')} className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                Albero delle Categorie
              </Button>
              {canManageCategories && (
                <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuova categoria
                </Button>
              )}
            </div>
          }
        />
        {(() => {
          const columns: Array<DataTableColumn<Category>> = [
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
              cell: (cat) => (
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">#{cat.id}</div>
                </div>
              ),
            },
            {
              key: 'title',
              header: (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Titolo</span>
                </div>
              ),
              cell: (cat) => (
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${cat.parent_id ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{cat.title}</div>
                    {cat.parent_id && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center space-x-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Sottocategoria</span>
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'slug',
              header: (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Slug</span>
                </div>
              ),
              cell: (cat) => (
                <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono">{cat.slug}</code>
              ),
            },
            {
              key: 'parent',
              header: (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span>Categoria genitore</span>
                </div>
              ),
              cell: (cat) => (
                cat.parent?.title ? (
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded">
                      <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{cat.parent.title}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                )
              ),
            },
            {
              key: 'articles',
              header: (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Articoli</span>
                </div>
              ),
              cell: (cat) => (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${(cat.articles_count ?? 0) > 0 ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-900 dark:text-white font-medium">{cat.articles_count ?? 0}</span>
                </div>
              ),
            },
            {
              key: 'actions',
              header: (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  <span>Azioni</span>
                </div>
              ),
              cell: (cat) => {
                const isSubcategory = cat.parent_id !== null && cat.parent_id !== undefined
                const canModifyDelete = canManageCategories && (!isSubcategory || canManageSubcategories)
                return (
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canModifyDelete}
                      onClick={() => canModifyDelete && onEdit(cat)}
                      className="flex items-center gap-1.5"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifica
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!canModifyDelete}
                      onClick={() => canModifyDelete && onDelete(cat)}
                      className="flex items-center gap-1.5"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Elimina
                    </Button>
                  </div>
                )
              },
            },
          ]

          return (
            <DataTable<Category>
              data={categories}
              columns={columns}
              rowKey={(row) => row.id}
              loading={isLoading}
              loadingLabel="Caricamento categorie..."
              emptyTitle="Nessuna categoria trovata"
              emptySubtitle="Prova a modificare i filtri di ricerca"
            />
          )
        })()}
      </div>

      {/* Pagination */}
      <PaginationBar
        total={total}
        currentPage={currentPage}
        totalPages={lastPage}
        perPage={perPage}
        setPerPage={setPerPage}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
      />

      {/* Modale Modifica */}
      {isEditOpen && editCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifica categoria</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">#{editCategory.id} - {editCategory.title}</p>
                  </div>
                </div>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors" 
                  onClick={() => setIsEditOpen(false)}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
                          <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">Titolo categoria</Label>
                  <div className="relative">
                    <Input 
                      id="title" 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      placeholder="Inserisci il titolo della categoria"
                      className="pl-10"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="parent_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria genitore (opzionale)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Input 
                        id="parent_id" 
                        value={editParentId} 
                        onChange={(e) => setEditParentId(e.target.value)} 
                        placeholder="ID categoria"
                        className="pl-8"
                      />
                      <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <Input 
                      placeholder="Cerca per nome..." 
                      value={editParentSearch} 
                      onChange={(e) => setEditParentSearch(e.target.value)} 
                      className="pl-8"
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      disabled={isSearchingParentEdit}
                      onClick={async () => {
                        if (!editParentSearch.trim()) {
                          setEditParentSearchResults([])
                          return
                        }
                        setIsSearchingParentEdit(true)
                        try {
                          const res = await searchCategories({ page: 1, per_page: 10, search: editParentSearch })
                          setEditParentSearchResults(res.data.data)
                        } catch {
                          toast.error('Errore durante la ricerca categorie genitore')
                        } finally {
                          setIsSearchingParentEdit(false)
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      {isSearchingParentEdit ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                      Cerca
                    </Button>
                  </div>
                  
                  {editParentSearchResults.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-56 overflow-auto">
                      {editParentSearchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => {
                            setEditParentId(String(c.id))
                            setEditParentSearchResults([])
                            toast.success(`Categoria genitore selezionata: ${c.title}`)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                                #{c.id}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{c.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Genitore: {c.parent?.title || 'Nessuno'}
                                </div>
                              </div>
                            </div>
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsEditOpen(false)} className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annulla
                </Button>
                <Button onClick={async () => {
                  if (!editCategory) return
                  if (!editTitle.trim() && editParentId === (editCategory.parent_id ? String(editCategory.parent_id) : '')) {
                    // Nessun cambiamento
                    setIsEditOpen(false)
                    return
                  }
                  try {
                    const payload: any = {}
                    if (editTitle.trim() && editTitle.trim() !== editCategory.title) payload.title = editTitle.trim()
                    // parent_id: consenti null/numero; invia solo se differente
                    const newPid = editParentId ? Number(editParentId) : null
                    const oldPid = editCategory.parent_id ?? null
                    if (newPid !== oldPid) payload.parent_id = newPid
                    await updateCategory(editCategory.id, payload)
                    toast.success('Categoria aggiornata')
                    setIsEditOpen(false)
                    // refresh
                    void loadData()
                  } catch (e) {
                    if (e instanceof ApiError && e.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Aggiornamento non riuscito')
                    }
                  }
                }} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salva modifiche
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Creazione */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuova categoria</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Crea una nuova categoria per organizzare i contenuti</p>
                  </div>
                </div>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors" 
                  onClick={() => setIsCreateOpen(false)}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
                          <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="new_title" className="text-sm font-medium text-gray-700 dark:text-gray-300">Titolo categoria</Label>
                  <div className="relative">
                    <Input 
                      id="new_title" 
                      value={newTitle} 
                      onChange={(e) => setNewTitle(e.target.value)} 
                      placeholder="Inserisci il titolo della categoria"
                      className="pl-10"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="new_parent_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria genitore (opzionale)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Input 
                        id="new_parent_id" 
                        value={newParentId} 
                        onChange={(e) => setNewParentId(e.target.value)} 
                        placeholder="ID categoria"
                        className="pl-8"
                      />
                      <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                    <Input 
                      placeholder="Cerca per nome..." 
                      value={parentSearch} 
                      onChange={(e) => setParentSearch(e.target.value)} 
                      className="pl-8"
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      disabled={isSearchingParent}
                      onClick={async () => {
                        if (!parentSearch.trim()) {
                          setParentSearchResults([])
                          return
                        }
                        setIsSearchingParent(true)
                        try {
                          const res = await searchCategories({ page: 1, per_page: 10, search: parentSearch })
                          setParentSearchResults(res.data.data)
                        } catch {
                          toast.error('Errore durante la ricerca categorie genitore')
                        } finally {
                          setIsSearchingParent(false)
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      {isSearchingParent ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                      Cerca
                    </Button>
                  </div>
                  
                  {parentSearchResults.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-56 overflow-auto">
                      {parentSearchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => {
                            setNewParentId(String(c.id))
                            setParentSearchResults([])
                            toast.success(`Categoria genitore selezionata: ${c.title}`)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                                #{c.id}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{c.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Genitore: {c.parent?.title || 'Nessuno'}
                                </div>
                              </div>
                            </div>
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)} className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annulla
                </Button>
                <Button onClick={async () => {
                  if (!newTitle.trim()) {
                    toast.error('Inserisci un titolo valido')
                    return
                  }
                  try {
                    await createCategory({ title: newTitle.trim(), parent_id: newParentId ? Number(newParentId) : null })
                    toast.success('Categoria creata con successo')
                    setIsCreateOpen(false)
                    setNewTitle('')
                    setNewParentId('')
                    setParentSearch('')
                    setParentSearchResults([])
                    void loadData()
                  } catch (e) {
                    if (e instanceof ApiError && e.status === 403) {
                      toast.error('Non sei autorizzato a fare questa operazione')
                    } else {
                      toast.error('Creazione non riuscita')
                    }
                  }
                }} className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crea categoria
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


