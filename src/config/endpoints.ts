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
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // OTP endpoints (utilizzati)
  OTP: {
    GENERATE: '/otp/generate',
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
