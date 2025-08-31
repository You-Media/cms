/**
 * Configurazione centralizzata degli endpoint API
 * Solo gli endpoint effettivamente utilizzati nel progetto
 */

export const API_ENDPOINTS = {
  // Base URL - configurato tramite variabile d'ambiente
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',

  // Authentication endpoints (utilizzati)
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-otp',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // OTP endpoints (utilizzati)
  OTP: {
    GENERATE: '/otp/generate',
  },

  // Profile endpoints
  PROFILE: {
    UPDATE_PARTIAL: '/me', // PATCH multipart/form-data
  },

  // Categories endpoints (nuova risorsa)
  CATEGORIES: {
    CREATE: '/categories',
    SEARCH: '/categories/search',
    TREE: '/categories/tree',
    DETAIL: (id: number | string) => `/categories/${id}`,
    DELETE: (id: number | string) => `/categories/${id}`,
    UPDATE: (id: number | string) => `/categories/${id}`,
  },

  // Banners endpoints
  BANNERS: {
    FILTER: '/banners/filter',
    DELETE: (id: number | string) => `/banners/${id}`,
    STATUS: (id: number | string) => `/banners/${id}/status`,
    ADD: '/banners/add',
    DETAIL: (id: number | string) => `/banners/${id}`,
  },

  // Users endpoints
  USERS: {
    SEARCH: '/users/search',
    PERMISSIONS_BY_ROLE: '/permissions/byRoles',
    BLOCK_PERMISSIONS: (id: number | string) => `/users/${id}/permissions/block`,
    UNBLOCK_PERMISSIONS: (id: number | string) => `/users/${id}/permissions/unblock`,
    DELETE: (id: number | string) => `/users/${id}`,
    CREATE: '/users',
    DETAIL: (id: number | string) => `/users/${id}`,
  },

  // Articles endpoints (per ricerca nel form banner)
  ARTICLES: {
    FILTER: '/me/articles/filter',
    FILTER_PUBLIC: '/articles/filter',
    SEARCH: '/articles/search',
    TOP_WEEKLY: '/articles/top-weekly',
    CREATE: '/articles',
    DETAIL: (id: number | string) => `/articles/${id}`,
    UPDATE: (id: number | string) => `/articles/${id}`,
    DELETE: (id: number | string) => `/articles/${id}`,
    APPROVE: (id: number | string) => `/articles/${id}/approve`,
    REJECT: (id: number | string) => `/articles/${id}/reject`,
    REVISION: (id: number | string) => `/articles/${id}/revision`,
    ADJUST_VIEWS: (id: number | string) => `/articles/${id}/views/adjust`,
    PUBLISH: (id: number | string) => `/articles/${id}/publish`,
    UNPUBLISH: (id: number | string) => `/articles/${id}/unpublish`,
    ARCHIVE: (id: number | string) => `/articles/${id}/archive`,
    DRAFT: (id: number | string) => `/articles/${id}/draft`,
  },

  // Notifications endpoints
  NOTIFICATIONS: {
    INDEX: '/notifications',
  },
} as const

// Utility function per costruire URL completi
export function buildApiUrl(endpoint: string): string {
  return `${API_ENDPOINTS.BASE_URL}${endpoint}`
}

// Utility function per validare se un endpoint esiste
export function isValidEndpoint(endpoint: string): boolean {
  const flatEndpoints = flattenEndpoints(API_ENDPOINTS)
  return flatEndpoints.includes(endpoint)
}

// Helper function per appiattire gli endpoint nested
function flattenEndpoints(obj: any, prefix = ''): string[] {
  let endpoints: string[] = []
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      endpoints.push(obj[key])
    } else if (typeof obj[key] === 'function') {
      // Skip functions for now
      continue
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      endpoints = endpoints.concat(flattenEndpoints(obj[key], prefix + key + '.'))
    }
  }
  
  return endpoints
}

// Type per gli endpoint (per type safety)
export type ApiEndpoint = typeof API_ENDPOINTS
export type EndpointKeys = keyof typeof API_ENDPOINTS
