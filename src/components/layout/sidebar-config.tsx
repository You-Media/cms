import type { ReactNode } from 'react'
import { APP_ROUTES } from '@/config/routes'

export interface SidebarItem {
  name: string
  href: string
  icon: ReactNode
}

export function buildSidebarNavigation(
  selectedSite: string | null,
  hasAnyRole: (rolesToCheck: string[]) => boolean
): SidebarItem[] {
  const items: SidebarItem[] = [
    {
      name: 'Dashboard',
      href: APP_ROUTES.DASHBOARD.HOME,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
    },
  ]

  if (selectedSite === 'editoria' && hasAnyRole(['ADMIN', 'Editor', 'EditorInChief'])) {
    items.push({
      name: 'Categorie',
      href: APP_ROUTES.DASHBOARD.CATEGORIES.LIST,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    })
  }

  return items
}


