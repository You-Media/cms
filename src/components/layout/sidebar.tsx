'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { APP_ROUTES } from '@/config/routes'
import { buildSidebarNavigation } from '@/components/layout/sidebar-config'
import { LogoutButton } from '@/components/layout/logout-button'

const baseNavigation = [
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
  // Aggiungeremo altre voci in base ai permessi
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, selectedSite, hasAnyRole } = useAuth()

  const navigation = buildSidebarNavigation(selectedSite, hasAnyRole)

  return (
    <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 pt-5 pb-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
          CMS YouMedia
        </h1>
      </div>

      {/* Navigation */}
      <nav className="mt-8 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={classNames(
                isActive
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-r-2 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-l-md transition-colors duration-200'
              )}
            >
              <span className={classNames(
                isActive 
                  ? 'text-amber-500' 
                  : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400',
                'mr-3 h-5 w-5'
              )}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="flex-shrink-0 flex flex-col border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* User card */}
          <div className="px-4 mb-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <img 
                src={user.profile.profile_photo} 
                alt={user.profile.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.profile.full_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <div className="px-4">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  )
}
