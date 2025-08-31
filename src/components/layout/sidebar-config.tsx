import type { ReactNode } from 'react'
import { APP_ROUTES } from '@/config/routes'

export interface SidebarItem {
  name: string
  href: string
  icon: ReactNode
}

export function buildSidebarNavigation(
  selectedSite: string | null,
  hasAnyRole: (rolesToCheck: string[]) => boolean,
  hasPermission: (permission: string) => boolean
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
    // Mostra categorie se l'utente ha i permessi per gestirle
    if (hasPermission('manage_categories')) {
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
    
    // Mostra tag se l'utente ha i permessi per gestirli
    if (hasPermission('manage_tags')) {
      items.push({
        name: 'Tag',
        href: APP_ROUTES.DASHBOARD.TAGS.LIST,
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      })
    }
  }

  if (selectedSite === 'editoria' && hasAnyRole(['Editor', 'EditorInChief', 'AdvertisingManager'])) {
    // Mostra banner se l'utente ha il permesso di visualizzarli
    if (hasPermission('view_banners')) {
      items.push({
        name: 'Banner Pubblicitari',
        href: APP_ROUTES.DASHBOARD.BANNERS.LIST,
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h8" />
          </svg>
        ),
      })
    }
  }

  // Utenti (solo sito 'editoria')
  // Regola: mostrare se il ruolo è tra Admin, Publisher, EditorInChief e
  // possiede almeno uno dei permessi specifici per quel ruolo
  if (selectedSite === 'editoria' && hasAnyRole(['Admin', 'Publisher', 'EditorInChief'])) {
    let canSeeUsers = false
    if (!canSeeUsers && hasAnyRole(['Admin'])) {
      canSeeUsers =
        hasPermission('manage_publishers') ||
        hasPermission('manage_editors_in_chief') ||
        hasPermission('manage_advertising_managers')
    }
    if (!canSeeUsers && hasAnyRole(['Publisher'])) {
      canSeeUsers =
        hasPermission('manage_editors_in_chief') ||
        hasPermission('manage_advertising_managers')
    }
    if (!canSeeUsers && hasAnyRole(['EditorInChief'])) {
      canSeeUsers = hasPermission('manage_journalists')
    }

    if (canSeeUsers) {
      items.push({
        name: 'Utenti',
        href: APP_ROUTES.DASHBOARD.USERS.LIST,
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4h-5M2 20h5V10H2m8 10h5V14h-5" />
          </svg>
        ),
      })
    }
  }

  return items
}


