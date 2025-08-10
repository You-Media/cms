import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import type { CategoriesSearchParams, CategoriesSearchResponse, CreateCategoryPayload, UpdateCategoryPayload, CategoryTreeResponse } from '@/types/categories'

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export async function searchCategories(params: CategoriesSearchParams): Promise<CategoriesSearchResponse> {
  const qs = buildQueryString(params)
  return api.get<CategoriesSearchResponse>(`${API_ENDPOINTS.CATEGORIES.SEARCH}${qs}`)
}

export async function deleteCategory(id: number | string): Promise<{ status: string; message: string }> {
  return api.delete<{ status: string; message: string }>(API_ENDPOINTS.CATEGORIES.DELETE(id))
}

export async function createCategory(payload: CreateCategoryPayload): Promise<{ status: string; message: string; data: { id: number } }> {
  return api.post<{ status: string; message: string; data: { id: number } }>(API_ENDPOINTS.CATEGORIES.CREATE, payload)
}

export async function fetchCategoryTree(): Promise<CategoryTreeResponse> {
  return api.get<CategoryTreeResponse>(API_ENDPOINTS.CATEGORIES.TREE)
}

export async function updateCategory(id: number | string, payload: UpdateCategoryPayload): Promise<{ status: string; message: string }> {
  return api.patch<{ status: string; message: string }>(API_ENDPOINTS.CATEGORIES.UPDATE(id), payload)
}

