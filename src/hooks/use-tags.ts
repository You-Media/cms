import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Tag, CreateTagRequest, UpdateTagRequest } from '@/types/tags'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [perPage, setPerPage] = useState(20)

  const fetchTags = useCallback(async (page: number = 1, search?: string, itemsPerPage?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      const pageSize = itemsPerPage || perPage
      params.append('per_page', pageSize.toString())
      if (search) {
        params.append('search', search)
      }

      const response = await api.get<{ 
        status: string, 
        message: string, 
        data: { 
          data: Array<{ id: number, title: string, slug: string, created_at: string, updated_at: string }>, 
          current_page: number, 
          per_page: number, 
          total: number, 
          last_page: number 
        } 
      }>(`/tags/search?${params.toString()}`)

      // Gestione della struttura API reale
      if (response?.data?.data && Array.isArray(response.data.data)) {
        // Mappa i tags dalla struttura API reale al nostro tipo Tag
        const mappedTags: Tag[] = response.data.data.map(tag => ({
          id: tag.id,
          name: tag.title, // L'API usa 'title' invece di 'name'
          slug: tag.slug,
          description: undefined, // L'API non ha description
          created_at: tag.created_at,
          updated_at: tag.updated_at
        }))

        setTags(mappedTags)
        setTotal(response.data.total || 0) // Usa il totale reale dall'API
        setCurrentPage(response.data.current_page || 1)
        setTotalPages(response.data.last_page || 1)
        setPerPage(pageSize)
      } else {
        console.warn('Unexpected API response structure:', response)
        setTags([])
        setTotal(0)
        setCurrentPage(1)
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Errore nel recupero dei tag:', error)
      setTags([])
      setTotal(0)
      setCurrentPage(1)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [perPage])

  const createTag = useCallback(async (tagData: CreateTagRequest): Promise<boolean> => {
    try {
      // Backend richiede { title, slug? }
      const payload = { title: tagData.name, slug: null as string | null }
      await api.post('/tags', payload)
      await fetchTags(currentPage, undefined, perPage)
      return true
    } catch (error) {
      console.error('Errore nella creazione del tag:', error)
      throw error
    }
  }, [fetchTags, currentPage, perPage])

  const updateTag = useCallback(async (id: number, tagData: UpdateTagRequest): Promise<boolean> => {
    try {
      // Backend usa title/slug. Mappiamo name -> title
      const payload: { title: string; slug?: string | null } = { title: tagData.name }
      await api.put(`/tags/${id}`, payload)
      await fetchTags(currentPage, undefined, perPage)
      return true
    } catch (error) {
      console.error('Errore nell\'aggiornamento del tag:', error)
      throw error
    }
  }, [fetchTags, currentPage, perPage])

  const deleteTag = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/tags/${id}`)
      await fetchTags(currentPage, undefined, perPage)
      return true
    } catch (error) {
      console.error('Errore nell\'eliminazione del tag:', error)
      throw error
    }
  }, [fetchTags, currentPage, perPage])

  return {
    tags,
    loading,
    total,
    currentPage,
    totalPages,
    perPage,
    setPerPage,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  }
}
