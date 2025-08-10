'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'

export function useAuth() {
  const { user, token, isLoading, error, selectedSite } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Marca come idratato dopo il primo render
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Ripristina il token e il sito nell'API client quando cambiano
    if (token) {
      api.setToken(token)
    }
    if (selectedSite) {
      api.setSelectedSite(selectedSite)
    }
  }, [token, selectedSite])

  const normalizePermission = (value: string) => value.toLowerCase().trim()

  return {
    user,
    token,
    isLoading: isLoading || !isHydrated,
    error,
    isAuthenticated: !!(user && token),
    isAdmin: user?.roles.includes('Admin') || false,
    userPermissions: user?.permissions || [],
    userRoles: user?.roles || [],
    fullName: user?.profile.full_name || '',
    email: user?.email || '',
    profilePhoto: user?.profile.profile_photo || '',
    selectedSite,
    // Helper ruoli con override superadmin
    get isSuperAdmin() {
      const roles = user?.roles || []
      const normalized = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      return normalized.includes('superadmin')
    },
    hasAnyRole: (rolesToCheck: string[]) => {
      const roles = user?.roles || []
      const normalizedUserRoles = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      const normalizedToCheck = rolesToCheck.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      // Override superadmin
      if (normalizedUserRoles.includes('superadmin')) return true
      return normalizedUserRoles.some((r) => normalizedToCheck.includes(r))
    },
    hasPermission: (permission: string) => {
      const roles = user?.roles || []
      // superadmin override
      const normalizedRoles = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      if (normalizedRoles.includes('superadmin')) return true
      const perms = user?.permissions || []
      const target = normalizePermission(permission)
      return perms.map(normalizePermission).includes(target)
    },
    hasAnyPermission: (permissions: string[]) => {
      const roles = user?.roles || []
      const normalizedRoles = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      if (normalizedRoles.includes('superadmin')) return true
      const perms = (user?.permissions || []).map(normalizePermission)
      const targets = permissions.map(normalizePermission)
      return targets.some((p) => perms.includes(p))
    },
    // Permessi specifici per categorie e tag
    canManageCategories: (() => {
      const roles = user?.roles || []
      const normalizedRoles = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      if (normalizedRoles.includes('superadmin')) return true
      const perms = user?.permissions || []
      const target = normalizePermission('manage_categories')
      return perms.map(normalizePermission).includes(target)
    })(),
    canManageSubcategories: (() => {
      const roles = user?.roles || []
      const normalizedRoles = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      if (normalizedRoles.includes('superadmin')) return true
      const perms = user?.permissions || []
      const target = normalizePermission('manage_subcategories')
      return perms.map(normalizePermission).includes(target)
    })(),
    canManageTags: (() => {
      const roles = user?.roles || []
      const normalizedRoles = roles.map((r) => r.toLowerCase().replace(/[^a-z]/g, ''))
      if (normalizedRoles.includes('superadmin')) return true
      const perms = user?.permissions || []
      const target = normalizePermission('manage_tags')
      return perms.map(normalizePermission).includes(target)
    })(),
  }
}
