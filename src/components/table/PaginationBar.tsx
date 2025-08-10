'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PaginationBarProps = {
  total: number
  currentPage: number
  totalPages: number
  perPage: number
  setPerPage: (value: number) => void
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function PaginationBar({
  total,
  currentPage,
  totalPages,
  perPage,
  setPerPage,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: PaginationBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Totale: <span className="text-blue-600 dark:text-blue-400">{total}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="per_page_bottom" className="text-sm text-gray-600 dark:text-gray-300">Elementi per pagina</Label>
            <Input
              id="per_page_bottom"
              value={String(perPage)}
              onChange={(e) => {
                const val = e.target.value.trim()
                const num = Number(val)
                if (!val) {
                  setPerPage(15)
                  return
                }
                if (Number.isNaN(num)) return
                const bounded = Math.max(1, Math.min(100, num))
                setPerPage(bounded)
              }}
              placeholder="15"
              className="w-20 text-center"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Pagina</span>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg font-medium">
              {currentPage}
            </div>
            <span>di</span>
            <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoPrev}
              onClick={onPrev}
              className="flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoNext}
              onClick={onNext}
              className="flex items-center gap-1.5"
            >
              Successiva
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


