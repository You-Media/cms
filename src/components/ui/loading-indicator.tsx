'use client'

import React from 'react'

type LoadingIndicatorProps = {
  label?: string
  inline?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

function sizeToPx(size: LoadingIndicatorProps['size']): number {
  switch (size) {
    case 'xs': return 12
    case 'sm': return 16
    case 'lg': return 24
    case 'md':
    default: return 20
  }
}

export function LoadingIndicator({ label, inline = true, size = 'sm', className }: LoadingIndicatorProps) {
  const px = sizeToPx(size)
  const content = (
    <span className={`inline-flex items-center gap-2 ${className || ''}`}>
      <svg className="animate-spin" style={{ width: px, height: px }} fill="none" viewBox="0 0 24 24" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  )
  if (inline) return content
  return (
    <div className="w-full flex items-center justify-center py-4 text-gray-600 dark:text-gray-300">
      {content}
    </div>
  )
}

export default LoadingIndicator


