import { useCallback, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import { toast } from 'sonner'
import type { ArticleStatus } from '@/types/articles'

export type Article = {
  id: number
  title: string
  slug?: string
  subtitle?: string
  published_at?: string
  ttr?: number
  priority?: number
  status?: ArticleStatus
  show_link?: string
  author?: { id: number; name: string; avatar?: string }
  categories?: Array<{ id: number; title: string; slug: string }>
  region?: string
  province?: string
  cover_preview?: string
  weekly_views?: number
  recent_order?: number
}

export function useArticles() {
  const [results, setResults] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const search = useCallback(async (params: { search?: string; category_id?: number | ''; region_name?: string; province_name?: string; status?: ArticleStatus; author_id?: number | ''; sort_by?: string; sort_direction?: 'asc' | 'desc'; per_page?: number; page?: number }) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (params.search) qs.append('search', params.search)
      if (params.category_id) qs.append('category_id', String(params.category_id))
      if (params.region_name) qs.append('region_name', params.region_name)
      if (params.province_name) qs.append('province_name', params.province_name)
      if (params.status) qs.append('status', params.status)
      if (params.author_id) qs.append('author_id', String(params.author_id))
      if (params.sort_by) qs.append('sort_by', params.sort_by)
      if (params.sort_direction) qs.append('sort_direction', params.sort_direction)
      qs.append('per_page', String(params.per_page ?? 10))
      qs.append('page', String(params.page ?? 1))

      // Sopprimi i toast globali e gestisci qui per evitare duplicati
      const res = await api.get<any>(`${API_ENDPOINTS.ARTICLES.FILTER}?${qs.toString()}`, undefined, { suppressGlobalToasts: true })
      const d = res?.data
      let list: Article[] = []
      let totalNum = 0
      let lastPageNum = 1
      let currentPageNum = 1

      if (Array.isArray(d)) {
        // data: Article[]
        list = d as Article[]
      } else if (Array.isArray(d?.data)) {
        // data: { data: Article[], total?, last_page?, current_page? }
        list = d.data as Article[]
        totalNum = d.total ?? 0
        lastPageNum = d.last_page ?? 1
        currentPageNum = d.current_page ?? 1
      } else if (Array.isArray(d?.data?.data)) {
        // data: { data: { data: Article[], total, last_page, current_page } }
        list = d.data.data as Article[]
        totalNum = d.data.total ?? 0
        lastPageNum = d.data.last_page ?? 1
        currentPageNum = d.data.current_page ?? 1
      }

      setResults(Array.isArray(list) ? list : [])
      setTotal(totalNum)
      setTotalPages(lastPageNum)
      setPage(currentPageNum)
    } catch (error) {
      // Mostra un solo toast lato hook per errori server
      if (error instanceof ApiError && error.status >= 500) {
        toast.error('Qualcosa è andato storto, riprova più tardi')
      }
      setResults([])
      setTotal(0)
      setTotalPages(1)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, page, totalPages, total, setPage, search }
}

export async function fetchUltimissimiArticles(limit: number = 10): Promise<{ status?: string; message?: string; data: Article[] } | { data: Article[] } | Article[]> {
  const qs = new URLSearchParams()
  if (limit) qs.append('limit', String(limit))
  // Sopprimi i toast globali; gestiamo errori a livello chiamante
  const res = await api.get<any>(`${API_ENDPOINTS.ARTICLES.ULTIMISSIMI}?${qs.toString()}`, undefined, { suppressGlobalToasts: true })
  return res
}

export async function updateArticle(id: number | string, payload: Partial<Article>): Promise<{ status?: string; message?: string }> {
  // Usa PATCH per aggiornamenti parziali, come richiesto dal backend
  return api.patch<any>(API_ENDPOINTS.ARTICLES.UPDATE(id), payload, undefined, { suppressGlobalToasts: true })
}


