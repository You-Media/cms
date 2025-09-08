"use client"

import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Accesso negato. Effettua il login per continuare.</p>
        <Link
          href={APP_ROUTES.AUTH.LOGIN}
          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-700"
        >
          Torna al login
        </Link>
      </div>
    </div>
  )
}


