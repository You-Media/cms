import { useState, useCallback } from 'react'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/config/endpoints'
import type { Banner, FilterBannersParams, FilterBannersResponse, BannerStatus } from '@/types/banners'

export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filterBanners = useCallback(async (params: FilterBannersParams = {}) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (params.model) qs.append('model', params.model)
      if (params.search) qs.append('search', params.search)
      if (params.position) qs.append('position', params.position)
      if (params.status) qs.append('status', params.status)
      if (params.sort_by) qs.append('sort_by', params.sort_by)
      if (params.sort_direction) qs.append('sort_direction', params.sort_direction)
      if (params.per_page) qs.append('per_page', String(params.per_page))
      if (params.page) qs.append('page', String(params.page))

      const res = await api.get<FilterBannersResponse>(`${API_ENDPOINTS.BANNERS.FILTER}?${qs.toString()}`)

      const pageSize = res.data.per_page
      const totalItems = res.data.total
      const lastPage = res.data.last_page

      setBanners(Array.isArray(res.data.data) ? res.data.data : [])
      setPerPage(pageSize)
      setTotal(totalItems)
      setTotalPages(lastPage)
      setCurrentPage(params.page || 1)
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Errore filtro banner:', error.status, error.message)
        if (error.status === 500) {
          toast.error('Qualcosa è andato storto. Riprova più tardi.')
        }
      } else {
        console.error('Errore filtro banner:', error)
      }
      setBanners([])
      setTotal(0)
      setTotalPages(1)
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteBanner = useCallback(async (id: number) => {
    try {
      await api.delete(API_ENDPOINTS.BANNERS.DELETE(id))
      await filterBanners({ page: currentPage, per_page: perPage })
      return true
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 500) {
          toast.error('Qualcosa è andato storto. Riprova più tardi.')
        }
        if (error.status === 403) {
          // Bubble up 403 for UI-specific message
          throw error
        }
      }
      throw error
    }
  }, [currentPage, perPage, filterBanners])

  const updateBannerStatus = useCallback(async (id: number, status: BannerStatus) => {
    try {
      await api.post(API_ENDPOINTS.BANNERS.STATUS(id), { status })
      await filterBanners({ page: currentPage, per_page: perPage })
      return true
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 500) {
          toast.error('Qualcosa è andato storto. Riprova più tardi.')
        }
        if (error.status === 403) {
          throw error
        }
      }
      throw error
    }
  }, [currentPage, perPage, filterBanners])

  const fetchBannerDetail = useCallback(async (id: number) => {
    try {
      const res = await api.get<{ status: string; message: string; data: Banner }>(API_ENDPOINTS.BANNERS.DETAIL(id))
      return res.data as unknown as Banner
    } catch (error) {
      if (error instanceof ApiError && error.status === 500) {
        toast.error('Qualcosa è andato storto. Riprova più tardi.')
      }
      throw error
    }
  }, [])

  return {
    banners,
    loading,
    total,
    currentPage,
    totalPages,
    perPage,
    setPerPage,
    filterBanners,
    deleteBanner,
    updateBannerStatus,
    fetchBannerDetail,
  }
}



