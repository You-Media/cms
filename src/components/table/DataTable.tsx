'use client'

import React from 'react'

export type DataTableColumn<T> = {
  key: string
  header: React.ReactNode
  cell: (row: T, rowIndex: number) => React.ReactNode
  thClassName?: string
  tdClassName?: string
}

type DataTableProps<T> = {
  data: T[]
  columns: Array<DataTableColumn<T>>
  rowKey: (row: T, index: number) => string | number
  loading?: boolean
  loadingLabel?: string
  emptyTitle?: string
  emptySubtitle?: string
  emptyIcon?: React.ReactNode
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  loadingLabel = 'Caricamento...',
  emptyTitle = 'Nessun risultato',
  emptySubtitle = 'Prova a modificare i filtri di ricerca',
  emptyIcon,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.thClassName ?? 'px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider'}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{loadingLabel}</p>
                </div>
              </td>
            </tr>
          ) : !data || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                    {emptyIcon ?? (
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{emptyTitle}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{emptySubtitle}</p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={rowKey(row, index)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                {columns.map((col) => (
                  <td key={col.key} className={col.tdClassName ?? 'px-6 py-4 whitespace-nowrap'}>
                    {col.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}


