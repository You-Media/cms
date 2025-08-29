'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTags } from '@/hooks/use-tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FiltersCard } from '@/components/table/FiltersCard'
import { ResultsHeader } from '@/components/table/ResultsHeader'
import { PaginationBar } from '@/components/table/PaginationBar'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { FormModal } from '@/components/table/FormModal'
import { toast } from 'sonner'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { ApiError } from '@/lib/api'
import { Tag, CreateTagRequest } from '@/types/tags'

export default function TagsPage() {
  const { canManageTags } = useAuth()
  const {
    tags,
    loading,
    total,
    currentPage,
    totalPages,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  } = useTags()

  const [searchTerm, setSearchTerm] = useState('')
  const [perPage, setPerPage] = useState<number>(15)
  const [page, setPage] = useState<number>(1)
  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState<CreateTagRequest>({
    name: '',
    description: '',
  })
  const lastParamsRef = useRef<string>('')

  useEffect(() => {
    const key = `${page}|${perPage}`
    if (lastParamsRef.current === key) return
    lastParamsRef.current = key
    fetchTags(page, searchTerm, perPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  // Auto-open create modal via query param (?create=1)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('create') === '1' && canManageTags) {
      setIsCreateModalOpen(true)
    }
  }, [canManageTags])

  // Controllo accesso basato sui permessi
  if (!canManageTags) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchTags(1, searchTerm, perPage)
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, description: tag.description || '' })
    setIsEditModalOpen(true)
  }

  const handleDelete = async (tag: Tag) => {
    const ok = window.confirm(`Confermi l'eliminazione di "${tag.name}"?`)
    if (!ok) return

    try {
      await deleteTag(tag.id)
      toast.success('Tag eliminato con successo')
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Eliminazione non riuscita')
      }
    }
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Inserisci un nome valido')
      return
    }

    try {
      await createTag(formData)
      toast.success('Tag creato con successo')
      setIsCreateModalOpen(false)
      setFormData({ name: '', description: '' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Creazione non riuscita')
      }
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTag || !formData.name.trim()) {
      toast.error('Inserisci un nome valido')
      return
    }

    try {
      await updateTag(editingTag.id, formData)
      toast.success('Tag aggiornato con successo')
      setIsEditModalOpen(false)
      setEditingTag(null)
      setFormData({ name: '', description: '' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Aggiornamento non riuscito')
      }
    }
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <PageHeaderCard
        title="Tag"
        subtitle="Gestisci e organizza i tag di editoriaresponsabile.com"
        icon={(
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7-7A1 1 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )}
      />

      {/* Search and Filters Card */}
      <FiltersCard onSubmit={onSearchSubmit} isLoading={loading} gridCols={2} submitUseEmptyLabel={true}>
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300">Ricerca per titolo</Label>
          <div className="relative">
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca nei tag..."
              className="pl-10"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </FiltersCard>

      {/* Results Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ResultsHeader
          title="Risultati"
          subtitle={total > 0 ? `${total} ${total === 1 ? 'tag trovato' : 'tag trovati'}` : 'Nessun risultato'}
          actions={canManageTags ? (
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo tag
            </Button>
          ) : null}
        />
        {(() => {
          const safeTags = Array.isArray(tags) ? tags : []
          const emptyTitle = Array.isArray(tags) ? 'Nessun tag trovato' : 'Errore nel caricamento dei tag'
          const emptySubtitle = Array.isArray(tags) ? 'Prova a modificare i filtri di ricerca' : 'Riprova più tardi'

          const columns: Array<DataTableColumn<Tag>> = [
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
              cell: (tag) => (
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    #{tag.id}
                  </div>
                </div>
              ),
            },
            {
              key: 'name',
              header: (
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Nome</span>
                </div>
              ),
              cell: (tag) => (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</div>
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
              cell: (tag) => (
                <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono">{tag.slug}</code>
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
              cell: (tag) => (
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canManageTags}
                    onClick={() => handleEdit(tag)}
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
                    disabled={!canManageTags}
                    onClick={() => handleDelete(tag)}
                    className="flex items-center gap-1.5"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Elimina
                  </Button>
                </div>
              ),
              tdClassName: 'px-6 py-4 whitespace-nowrap',
            },
          ]

          return (
            <DataTable<Tag>
              data={safeTags}
              columns={columns}
              rowKey={(row) => row.id}
              loading={loading}
              loadingLabel="Caricamento tag..."
              emptyTitle={emptyTitle}
              emptySubtitle={emptySubtitle}
            />
          )
        })()}
      </div>

      {/* Pagination */}
      <PaginationBar
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        perPage={perPage}
        setPerPage={setPerPage}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={() => handlePageChange(Math.max(1, currentPage - 1))}
        onNext={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
      />

      {/* Modale Creazione */}
      {isCreateModalOpen && (
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuovo tag</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Crea un nuovo tag per organizzare i contenuti</p>
                  </div>
                </div>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitCreate} className="p-6 space-y-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome tag</Label>
                  <div className="relative">
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="Inserisci il nome del tag"
                      className="pl-10"
                      required
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrizione (opzionale)</Label>
                  <div className="relative">
                    <Input 
                      id="description" 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      placeholder="Inserisci una descrizione del tag"
                      className="pl-10"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </form>
            
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annulla
                </Button>
                <Button onClick={handleSubmitCreate} className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crea tag
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Modifica */}
      {isEditModalOpen && editingTag && (
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modifica tag</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">#{editingTag.id} - {editingTag.name}</p>
                  </div>
                </div>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors" 
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingTag(null)
                  }}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome tag</Label>
                  <div className="relative">
                    <Input 
                      id="edit-name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="Inserisci il nome del tag"
                      className="pl-10"
                      required
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrizione (opzionale)</Label>
                  <div className="relative">
                    <Input 
                      id="edit-description" 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      placeholder="Inserisci una descrizione del tag"
                      className="pl-10"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </form>
            
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingTag(null)
                }} className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annulla
                </Button>
                <Button onClick={handleSubmitEdit} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Aggiorna tag
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
