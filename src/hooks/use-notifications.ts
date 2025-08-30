import { useCallback, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import type { NotificationItem, NotificationsIndexResponse } from '@/types/notifications'
import { toast } from 'sonner'

export type NotificationsQuery = {
  page?: number
  per_page?: number
}

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const toPositiveInt = (value: unknown, fallback: number): number => {
    const n = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value, 10) : NaN)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  const fetchNotifications = useCallback(async (params: NotificationsQuery = {}) => {
    setLoading(true)
    const pageParam = params.page ?? 1
    const perPageParam = params.per_page ?? 10
    try {
      const query = new URLSearchParams()
      query.append('page', String(pageParam))
      query.append('per_page', String(perPageParam))

      const res = await api.get<any>(`${API_ENDPOINTS.NOTIFICATIONS.INDEX}?${query.toString()}`)
      // Support multiple payload shapes:
      // 1) { data: NotificationItem[], meta: {...} }
      // 2) { status, message, data: { data: NotificationItem[], meta: {...} } }
      // 3) { status, message, data: NotificationItem[] }
      let list: NotificationItem[] = []
      let meta: any = undefined
      if (Array.isArray(res?.data)) {
        list = res.data as NotificationItem[]
        meta = (res as any).meta ?? undefined
      } else if (Array.isArray(res?.data?.data)) {
        list = res.data.data as NotificationItem[]
        meta = (res.data as any).meta ?? {
          current_page: (res.data as any).current_page,
          per_page: (res.data as any).per_page,
          total: (res.data as any).total,
          last_page: (res.data as any).last_page,
        }
      } else if (Array.isArray(res)) {
        list = res as NotificationItem[]
        meta = undefined
      }
      const totalNum = meta ? toPositiveInt(meta.total, list.length) : list.length
      const perPageNum = meta ? toPositiveInt(meta.per_page, perPageParam) : perPageParam
      const currentPageNum = meta ? toPositiveInt(meta.current_page, pageParam) : pageParam
      const lastPageNum = meta ? toPositiveInt(meta.last_page, Math.max(1, Math.ceil(totalNum / Math.max(1, perPageNum)))) : Math.max(1, Math.ceil(totalNum / Math.max(1, perPageNum)))

      setItems(Array.isArray(list) ? list : [])
      setPage(currentPageNum)
      setPerPage(perPageNum)
      setTotal(totalNum)
      setTotalPages(lastPageNum)
    } catch (error) {
      if (error instanceof ApiError && error.status === 500) {
        toast.error('Qualcosa è andato storto. Riprova più tardi.')
      }
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, page, perPage, total, totalPages, setPage, setPerPage, fetchNotifications }
}


