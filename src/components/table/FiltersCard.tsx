'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

type FiltersCardProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
  gridCols?: 2 | 3
  submitLabel?: string
  submitFullWidth?: boolean
  submitUseEmptyLabel?: boolean
  children: React.ReactNode
  title?: string
}

export function FiltersCard({
  onSubmit,
  isLoading = false,
  gridCols = 2,
  submitLabel = 'Cerca',
  submitFullWidth = true,
  submitUseEmptyLabel = false,
  children,
  title = 'Filtri di ricerca',
}: FiltersCardProps) {
  const mdColsClass = gridCols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <form onSubmit={onSubmit} className={`grid grid-cols-1 ${mdColsClass} gap-6 items-end`}>
        {children}
        <div className={`space-y-2 ${submitFullWidth ? '' : 'flex justify-end'} h-full`}>
          {submitUseEmptyLabel && (
            <div className="text-sm font-medium leading-none opacity-0 select-none">Label</div>
          )}
          <Button type="submit" disabled={isLoading} className={`${submitFullWidth ? 'w-full' : 'w-auto'} h-12`}>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {submitLabel}...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}


