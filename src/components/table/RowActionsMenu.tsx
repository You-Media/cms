'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export interface RowActionItem {
  label: string
  onClick?: () => void | Promise<void>
  href?: string
  disabled?: boolean
  destructive?: boolean
  icon?: React.ReactNode
}

interface RowActionsMenuProps {
  items: RowActionItem[]
  ariaLabel: string
}

export function RowActionsMenu({ items, ariaLabel }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      const insideButton = menuRef.current && menuRef.current.contains(target)
      const insidePanel = panelRef.current && panelRef.current.contains(target)
      if (!insideButton && !insidePanel) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    function positionMenu() {
      if (!open) return
      const btn = buttonRef.current
      const MENU_WIDTH = 192
      const ESTIMATED_MENU_HEIGHT = 200
      const GAP = 8
      if (btn) {
        const rect = btn.getBoundingClientRect()
        let left = rect.left
        let top = rect.bottom + GAP
        if (top + ESTIMATED_MENU_HEIGHT > window.innerHeight - 8) {
          top = rect.top - GAP - ESTIMATED_MENU_HEIGHT
          if (top < 8) {
            top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - ESTIMATED_MENU_HEIGHT - 8))
          }
        }
        if (left + MENU_WIDTH > window.innerWidth - 8) {
          left = Math.max(8, window.innerWidth - MENU_WIDTH - 8)
        }
        if (left < 8) left = 8
        setMenuPos({ top, left })
      }
    }
    positionMenu()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const btn = buttonRef.current
    const panel = panelRef.current
    if (!btn || !panel) return
    const rect = btn.getBoundingClientRect()
    const GAP = 8
    const MARGIN = 8
    const h = panel.offsetHeight || 0
    const w = panel.offsetWidth || 192
    let left = rect.left
    let top = rect.bottom + GAP
    if (top + h > window.innerHeight - MARGIN) {
      const topAbove = rect.top - GAP - h
      if (topAbove >= MARGIN) {
        top = topAbove
      } else {
        top = Math.max(MARGIN, Math.min(topAbove, window.innerHeight - h - MARGIN))
      }
    }
    if (left + w > window.innerWidth - MARGIN) {
      left = Math.max(MARGIN, window.innerWidth - w - MARGIN)
    }
    if (left < MARGIN) left = MARGIN
    setMenuPos({ top, left })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="h-9 w-9 p-0 inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        ref={buttonRef}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && menuPos && (
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-[2000] py-1"
          role="menu"
        >
          {items.map((it, idx) => {
            const base = `w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${it.destructive ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'} ${it.disabled ? 'opacity-50 cursor-not-allowed' : ''}`
            if (it.href) {
              return (
                <Link key={idx} href={it.href} className={base} onClick={() => setOpen(false)}>
                  {it.icon}
                  <span>{it.label}</span>
                </Link>
              )
            }
            return (
              <button
                key={idx}
                type="button"
                className={base}
                disabled={it.disabled}
                onClick={async () => {
                  if (it.disabled) return
                  setOpen(false)
                  try { await it.onClick?.() } catch {}
                }}
              >
                {it.icon}
                <span>{it.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RowActionsMenu


