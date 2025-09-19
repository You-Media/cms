import { useCallback, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import { toast } from 'sonner'
import type { Contact } from '@/types/contacts'

export function useContacts() {
  const [results, setResults] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const search = useCallback(async (params: { per_page?: number; page?: number }) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.append('per_page', String(params.per_page ?? 15))
      qs.append('page', String(params.page ?? 1))

      // Sopprimi i toast globali e gestisci qui per evitare duplicati
      const res = await api.get<any>(`${API_ENDPOINTS.CONTACTS.LIST}?${qs.toString()}`, undefined, { suppressGlobalToasts: true })
      const d = res?.data
      let list: Contact[] = []
      let totalNum = 0
      let lastPageNum = 1
      let currentPageNum = 1

      if (Array.isArray(d)) {
        // data: Contact[]
        list = d as Contact[]
      } else if (Array.isArray(d?.data)) {
        // data: { data: Contact[], total?, last_page?, current_page? }
        list = d.data as Contact[]
        totalNum = d.total ?? 0
        lastPageNum = d.last_page ?? 1
        currentPageNum = d.current_page ?? 1
      } else if (Array.isArray(d?.data?.data)) {
        // data: { data: { data: Contact[], total, last_page, current_page } }
        list = d.data.data as Contact[]
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

