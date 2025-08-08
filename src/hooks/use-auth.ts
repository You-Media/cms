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
  }
}
