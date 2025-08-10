'use client'

import React from 'react'

type ResultsHeaderProps = {
  title: string
  subtitle: string
  actions?: React.ReactNode
  icon?: React.ReactNode
}

export function ResultsHeader({ title, subtitle, actions, icon }: ResultsHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center space-x-3">
        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
          {icon ?? (
            <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </div>
  )
}


