/**
 * Configurazione centralizzata delle rotte interne dell'applicazione
 * Solo le rotte effettivamente utilizzate nel progetto
 */

export const APP_ROUTES = {
  // Home e pubbliche
  HOME: '/',
  
  // Authentication routes (utilizzate)
  AUTH: {
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },

  // Dashboard routes (utilizzate)
  DASHBOARD: {
    HOME: '/dashboard',
    USERS: {
      LIST: '/dashboard/users',
      NEW: '/dashboard/users/new',
      EDIT: (id: string | number) => `/dashboard/users/${id}`,
    },
    CATEGORIES: {
      LIST: '/dashboard/categories',
      TREE: '/dashboard/categories/tree',
    },
    TAGS: {
      LIST: '/dashboard/tags',
    },
    ARTICLES: {
      LIST: '/dashboard/articles',
      NEW: '/dashboard/articles/new',
      EDIT: (id: string | number) => `/dashboard/articles/${id}`,
    },
    BANNERS: {
      LIST: '/dashboard/banners',
      NEW: '/dashboard/banners/new',
    EDIT: (id: string | number) => `/dashboard/banners/${id}`,
    },
  },
} as const

// Utility functions
export function buildRoute(routeTemplate: string, params: Record<string, string | number> = {}): string {
  let route = routeTemplate
  
  Object.entries(params).forEach(([key, value]) => {
    route = route.replace(`:${key}`, String(value))
  })
  
  return route
}

// Check if current path matches a route pattern
export function isActiveRoute(currentPath: string, routePath: string): boolean {
  if (routePath === '/') {
    return currentPath === '/'
  }
  
  // Handle dynamic routes
  if (typeof routePath === 'function') {
    // For function-based routes, we need to check if the path starts with the base
    return false // This would need more complex logic for dynamic matching
  }
  
  return currentPath.startsWith(routePath)
}

// Get breadcrumbs for a given path
export function getBreadcrumbs(pathname: string): Array<{ label: string; href: string; active?: boolean }> {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: Array<{ label: string; href: string; active?: boolean }> = []
  
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Map segments to readable labels
    const label = getSegmentLabel(segment, segments, index)
    
    breadcrumbs.push({
      label,
      href: currentPath,
      active: index === segments.length - 1,
    })
  })
  
  return breadcrumbs
}

// Helper function to get human-readable labels for route segments
function getSegmentLabel(segment: string, segments: string[], index: number): string {
  const segmentMap: Record<string, string> = {
    dashboard: 'Dashboard',
    sites: 'Siti',
    content: 'Contenuti',
    media: 'Media',
    users: 'Utenti',
    roles: 'Ruoli',
    settings: 'Impostazioni',
    categories: 'Categorie',
    subcategories: 'Sottocategorie',
    tags: 'Tag',
    articles: 'Articoli',
    banners: 'Banner',
    publishers: 'Publisher',
    'editors-in-chief': 'Caporedattori',
    'advertising-managers': 'Manager Pubblicità',
    analytics: 'Analytics',
    new: 'Nuovo',
    edit: 'Modifica',
    invite: 'Invita',
    profile: 'Profilo',
    preferences: 'Preferenze',
    notifications: 'Notifiche',
    security: 'Sicurezza',
    'api-keys': 'Chiavi API',
    search: 'Ricerca',
    traffic: 'Traffico',
    engagement: 'Coinvolgimento',
    reports: 'Report',
    overview: 'Panoramica',
    gallery: 'Galleria',
    folders: 'Cartelle',
    upload: 'Upload',
    permissions: 'Permessi',
  }
  
  // Check if it's a UUID or ID
  if (isValidId(segment) && index > 0) {
    const entityType = segments[index - 1]
    // In a real app, you might want to fetch the entity name
    return `${segmentMap[entityType] || entityType} #${segment.slice(0, 8)}`
  }
  
  return segmentMap[segment] || segment
}

// Helper to check if a segment looks like an ID
function isValidId(segment: string): boolean {
  // UUID pattern or numeric ID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const numericPattern = /^\d+$/
  
  return uuidPattern.test(segment) || numericPattern.test(segment)
}

// Route validation
export function isValidRoute(pathname: string): boolean {
  // Basic validation - in a real app you might want more sophisticated checking
  const validPrefixes = [
    '/',
    '/login',
    '/dashboard',
    '/profile',
    '/forgot-password',
    '/reset-password',
  ]
  
  return validPrefixes.some(prefix => pathname.startsWith(prefix))
}

// Route permissions - maps routes to required permissions
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/sites': ['manage_sites'],
  // Accesso alla gestione utenti consentito se l'utente possiede ALMENO uno dei permessi specifici
  // (la lista rappresenta una condizione OR)
  '/dashboard/users': [
    'manage_publishers',
    'manage_editors_in_chief',
    'manage_advertising_managers',
    'manage_journalists',
  ],
  '/dashboard/roles': ['manage_roles'],
  '/dashboard/settings': ['manage_settings'],
  '/dashboard/categories': ['read_categories'],
  '/dashboard/tags': ['read_tags'],
  '/dashboard/articles': ['read_articles'],
  '/dashboard/articles/new': ['create_article'],
  '/dashboard/banners': ['view_banners'],
  '/dashboard/banners/new': ['create_banner'],
  '/dashboard/users/new': ['manage_users'],
}

// Check if user has permission for a route
export function hasRoutePermission(userPermissions: string[], route: string): boolean {
  const requiredPermissions = ROUTE_PERMISSIONS[route]
  
  if (!requiredPermissions) {
    return true // No specific permissions required
  }
  
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

// Types
export type AppRoutes = typeof APP_ROUTES
export type RouteKeys = keyof typeof APP_ROUTES
