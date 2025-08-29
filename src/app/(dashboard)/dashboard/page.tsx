'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/config/routes'
import { roleLabelIt } from '@/types/roles'

export default function DashboardPage() {
  const { user } = useAuth()
  const { hasPermission, hasAnyPermission } = useAuth()
  const { selectedSite, hasAnyRole } = useAuth()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const didFetchRef = useRef(false)

  // Quick action permissions
  const canCreateArticle = hasAnyPermission(['create_content'])
  const canCreateBanner = hasAnyPermission(['create_banner'])
  const canCreateUser = hasAnyPermission([
    'manage_users',
    'manage_publishers',
    'manage_editors_in_chief',
    'manage_advertising_managers',
    'manage_journalists',
  ])
  const canCreateCategory = (
    selectedSite === 'editoria' &&
    hasAnyRole(['ADMIN', 'Editor', 'EditorInChief']) &&
    hasPermission('manage_categories')
  )
  const canCreateTag = (
    hasAnyRole(['ADMIN', 'Editor', 'EditorInChief']) &&
    hasPermission('manage_tags')
  )

  useEffect(() => {
    if (didFetchRef.current) return
    didFetchRef.current = true
    fetchMe()
  }, [fetchMe])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Benvenuto nel tuo pannello di controllo CMS
        </p>
      </div>

      {/* Welcome card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {user?.profile.profile_photo && (
            <img 
              src={user.profile.profile_photo} 
              alt={user.profile.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Benvenuto, {user?.profile.full_name}!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {user?.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.roles.map((role) => (
                <span 
                  key={role}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  {roleLabelIt(role)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {(canCreateArticle || canCreateBanner || canCreateUser || canCreateCategory || canCreateTag) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Azioni Rapide
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Crea rapidamente nuove risorse
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {canCreateCategory && (
              <Link href={`${APP_ROUTES.DASHBOARD.CATEGORIES.LIST}?create=1`}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Nuova categoria
                </Button>
              </Link>
            )}

            {canCreateTag && (
              <Link href={`${APP_ROUTES.DASHBOARD.TAGS.LIST}?create=1`}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7-7A1 1 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Nuovo tag
                </Button>
              </Link>
            )}
            {canCreateArticle && (
              <Link href={APP_ROUTES.DASHBOARD.ARTICLES.NEW}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6M9 16h6" />
                  </svg>
                  Nuovo articolo
                </Button>
              </Link>
            )}
            {canCreateBanner && (
              <Link href={APP_ROUTES.DASHBOARD.BANNERS.NEW}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h8" />
                  </svg>
                  Nuovo banner
                </Button>
              </Link>
            )}
            {canCreateUser && (
              <Link href={APP_ROUTES.DASHBOARD.USERS.NEW}>
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  Nuovo utente
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}


      {/* Recent activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Attività Recenti
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Nessuna attività recente da mostrare
          </p>
        </div>
      </div>
    </div>
  )
}
