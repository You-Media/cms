/* eslint-disable react-hooks/rules-of-hooks */
'use client'

import React, { useId } from 'react'
import { Button } from '@/components/ui/button'

type Variant = 'blue' | 'green'

type FormModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitLabel?: string
  cancelLabel?: string
  variant?: Variant
  icon?: React.ReactNode
  loading?: boolean
  children: React.ReactNode
}

const headerClassesByVariant: Record<Variant, string> = {
  blue: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700',
  green: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700',
}

const submitButtonClassesByVariant: Record<Variant, string> = {
  blue: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
  green: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
}

export function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  onSubmit,
  submitLabel = 'Salva',
  cancelLabel = 'Annulla',
  variant = 'blue',
  icon,
  loading = false,
  children,
}: FormModalProps) {
  if (!isOpen) return null

  const formId = useId()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className={`${headerClassesByVariant[variant]} px-6 py-4 border-b border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={variant === 'blue' ? 'bg-blue-100 dark:bg-blue-900 p-2 rounded-lg' : 'bg-green-100 dark:bg-green-900 p-2 rounded-lg'}>
                {icon ?? (
                  <svg className={`h-5 w-5 ${variant === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>}
              </div>
            </div>
            <button
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              onClick={onClose}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6" id={formId}>
          {children}
        </form>

        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={loading} className={`flex items-center gap-2 ${submitButtonClassesByVariant[variant]}`} form={formId}>
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


