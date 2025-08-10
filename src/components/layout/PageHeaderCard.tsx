'use client'

import React from 'react'

type Variant = 'blue' | 'indigo' | 'green'

type PageHeaderCardProps = {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  blue: 'from-blue-50 to-indigo-50',
  indigo: 'from-indigo-50 to-purple-50',
  green: 'from-green-50 to-emerald-50',
}

export function PageHeaderCard({ icon, title, subtitle, variant = 'blue' }: PageHeaderCardProps) {
  return (
    <div className={`bg-gradient-to-r ${variantClasses[variant]} dark:from-gray-800 dark:to-gray-700 rounded-xl p-6`}>
      <div className="flex items-center space-x-3">
        {icon && <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">{icon}</div>}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>}
        </div>
      </div>
    </div>
  )}


