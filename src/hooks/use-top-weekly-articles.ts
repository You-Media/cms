import { useCallback, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import type { Article } from '@/hooks/use-articles'
import { toast } from 'sonner'

export function useTopWeeklyArticles() {
  const [items, setItems] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTop = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<any>(API_ENDPOINTS.ARTICLES.TOP_WEEKLY)
      // Support payload: { status, message, data: Article[] } OR { data: Article[] }
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []))
      setItems(Array.isArray(list) ? list.slice(0, 4) : [])
    } catch (error) {
      if (error instanceof ApiError && error.status === 500) {
        toast.error('Impossibile caricare i top articoli della settimana')
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, fetchTop }
}


