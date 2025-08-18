import { useCallback, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'

export type UserRoleFilter = 'EditorInChief' | 'Publisher' | 'AdvertisingManager' | 'Journalist' | 'Consumer'

export interface UsersSearchParams {
  page?: number
  per_page?: number
  search?: string
  roles?: UserRoleFilter[]
}

export interface UsersSearchRow {
  id: number
  fullName: string
  email: string
  createdAt: string | null
  roles: string[]
  permissions: string[]
  profilePhoto?: string
  articlesCount?: number
}

export interface UsersSearchResponse {
  status: string
  message: string
  data: {
    data: Array<any>
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      // Backend richiede notazione array per ruoli: roles[]
      const arrayKey = key === 'roles' ? 'roles[]' : key
      value.forEach((v) => query.append(arrayKey, String(v)))
    } else {
      query.append(key, String(value))
    }
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useUsers() {
  const [rows, setRows] = useState<UsersSearchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  const searchUsers = useCallback(async (params: UsersSearchParams) => {
    setLoading(true)
    try {
      const qs = buildQueryString({
        page: params.page ?? 1,
        per_page: params.per_page ?? perPage,
        search: params.search ?? undefined,
        roles: params.roles && params.roles.length > 0 ? params.roles : undefined,
      })
      const res = await api.get<UsersSearchResponse>(`${API_ENDPOINTS.USERS.SEARCH}${qs}`)
      const payload = res?.data
      if (payload && Array.isArray(payload.data)) {
        const mapped: UsersSearchRow[] = payload.data.map((u: any) => ({
          id: u.id,
          fullName: u?.profile?.full_name || '',
          email: u.email,
          createdAt: u.created_at || null,
          roles: Array.isArray(u.roles) ? u.roles : [],
          permissions: Array.isArray(u.permissions) ? u.permissions.map((p: any) => typeof p === 'string' ? p : (p?.name || '')).filter(Boolean) : [],
          profilePhoto: u?.profile?.profile_photo || undefined,
          articlesCount: typeof u?.articles_count === 'number' ? u.articles_count : undefined,
        }))
        setRows(mapped)
        setTotal(payload.total || 0)
        setCurrentPage(payload.current_page || 1)
        setTotalPages(payload.last_page || 1)
        setPerPage(payload.per_page || perPage)
      } else {
        setRows([])
        setTotal(0)
        setCurrentPage(1)
        setTotalPages(1)
      }
    } finally {
      setLoading(false)
    }
  }, [perPage])

  const updateCachedUserPermissions = useCallback((userId: number | string, newPermissions: string[]) => {
    setRows((prev) => prev.map((r) => (r.id === Number(userId) ? { ...r, permissions: newPermissions } : r)))
  }, [])

  return {
    rows,
    loading,
    permissionsLoading,
    total,
    currentPage,
    totalPages,
    perPage,
    setPerPage,
    searchUsers,
    updateCachedUserPermissions,
  }
}

export interface RolePermissionItem { name: string; display_name: string; description?: string }
export async function fetchPermissionsByRole(roles: string[]): Promise<{ status: string; message: string; data: RolePermissionItem[] }> {
  const qs = new URLSearchParams()
  roles.forEach((r) => qs.append('roles[]', r))
  return api.get<{ status: string; message: string; data: RolePermissionItem[] }>(`${API_ENDPOINTS.USERS.PERMISSIONS_BY_ROLE}?${qs.toString()}`)
}

export async function blockUserPermissions(userId: number | string, permissions: string[]): Promise<{ status: string; message: string }> {
  return api.post<{ status: string; message: string }>(API_ENDPOINTS.USERS.BLOCK_PERMISSIONS(userId), { permissions })
}

export async function unblockUserPermissions(userId: number | string, permissions: string[]): Promise<{ status: string; message: string }> {
  const qs = new URLSearchParams()
  permissions.forEach((p) => qs.append('permissions[]', p))
  return api.delete<{ status: string; message: string }>(`${API_ENDPOINTS.USERS.UNBLOCK_PERMISSIONS(userId)}?${qs.toString()}`)
}

export async function deleteUser(userId: number | string): Promise<{ status: string; message: string }> {
  // Sopprimi i toast globali per gestire localmente 401/5xx senza duplicati nel flusso di cancellazione
  return api.delete<{ status: string; message: string }>(API_ENDPOINTS.USERS.DELETE(userId), undefined, { suppressGlobalToasts: true })
}

export interface CreateUserPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
  roles: string[]
  profile_photo?: File | null
}

export async function createUser(payload: CreateUserPayload): Promise<{ status: string; message: string; data?: { id: number } }> {
  const form = new FormData()
  form.append('first_name', payload.first_name)
  form.append('last_name', payload.last_name)
  form.append('email', payload.email)
  form.append('password', payload.password)
  form.append('password_confirmation', payload.password_confirmation)
  payload.roles.forEach((r) => form.append('roles[]', r))
  if (payload.profile_photo) form.append('profile_photo', payload.profile_photo)
  // Lasciare i toast globali attivi per tutti gli errori
  return api.post<{ status: string; message: string; data?: { id: number } }>(API_ENDPOINTS.USERS.CREATE, form)
}

export interface UpdateUserPayload {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  password_confirmation?: string
  roles?: string[]
  profile_photo?: File | null
  remove_profile_photo?: boolean
}

export async function fetchUserDetail(userId: number | string): Promise<any> {
  // Simple in-memory cache + in-flight dedup to avoid double network calls in React StrictMode
  const cacheKey = String(userId)
  if (!('__userDetailCache' in globalThis)) {
    ;(globalThis as any).__userDetailCache = new Map<string, any>()
  }
  if (!('__userDetailInFlight' in globalThis)) {
    ;(globalThis as any).__userDetailInFlight = new Map<string, Promise<any>>()
  }
  const cache: Map<string, any> = (globalThis as any).__userDetailCache
  const inFlight: Map<string, Promise<any>> = (globalThis as any).__userDetailInFlight

  if (cache.has(cacheKey)) {
    return Promise.resolve(cache.get(cacheKey))
  }
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey) as Promise<any>
  }
  const request = api
    .get<any>(API_ENDPOINTS.USERS.DETAIL(userId))
    .then((res) => {
      cache.set(cacheKey, res)
      inFlight.delete(cacheKey)
      return res
    })
    .catch((err) => {
      inFlight.delete(cacheKey)
      throw err
    })
  inFlight.set(cacheKey, request)
  return request
}

export async function updateUser(userId: number | string, payload: UpdateUserPayload): Promise<{ status: string; message: string }> {
  const form = new FormData()
  // Use POST + _method=PUT for multipart compatibility
  form.append('_method', 'PUT')
  if (payload.first_name !== undefined) form.append('first_name', payload.first_name)
  if (payload.last_name !== undefined) form.append('last_name', payload.last_name)
  if (payload.email !== undefined) form.append('email', payload.email)
  if (payload.password !== undefined) form.append('password', payload.password)
  if (payload.password_confirmation !== undefined) form.append('password_confirmation', payload.password_confirmation)
  if (payload.roles) payload.roles.forEach((r) => form.append('roles[]', r))
  if (payload.profile_photo) form.append('profile_photo', payload.profile_photo)
  if (payload.remove_profile_photo) form.append('remove_profile_photo', '1')
  // PATCH multipart
  return api.post<{ status: string; message: string }>(API_ENDPOINTS.USERS.DETAIL(userId), form, undefined, { suppressGlobalToasts: false })
}


