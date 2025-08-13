'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchCategories } from '@/hooks/use-categories'
import type { Category } from '@/types/categories'

type CategoryPickerProps = {
  valueId: number | ''
  onChangeId: (id: number | '') => void
  onChangeLabel?: (label: string | null) => void
  label?: string
  placeholder?: string
  autoFocus?: boolean
}

export function CategoryPicker({ valueId, onChangeId, onChangeLabel, label = 'Seleziona categoria', placeholder = 'Cerca per titolo categoria...', autoFocus = false }: CategoryPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<{ id: number; title: string } | null>(null)

  // Keep selected summary in sync with external value
  useEffect(() => {
    if (!valueId) {
      setSelected(null)
      return
    }
    // If already selected with same id, keep
    if (selected?.id === valueId) return
    // Best effort: if present in results, set it; otherwise just set placeholder title
    const found = results.find(r => r.id === valueId)
    if (found) {
      setSelected({ id: found.id, title: found.title })
    } else {
      setSelected({ id: valueId as number, title: `ID ${valueId}` })
    }
  }, [valueId, results])

  // Debounced search
  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await searchCategories({ search: query || null, per_page: 10, page: 1 })
        setResults(res.data.data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const emptyState = useMemo(() => !loading && results.length === 0, [loading, results])

  function highlight(text: string, q: string) {
    if (!q) return text
    try {
      const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'))
      return parts.map((part, i) => part.toLowerCase() === q.toLowerCase() ? <mark key={i} className="bg-amber-200/70 dark:bg-amber-700/40 rounded px-0.5">{part}</mark> : <span key={i}>{part}</span>)
    } catch {
      return text
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {selected && (
          <Button type="button" variant="secondary" size="sm" onClick={() => { onChangeId(''); onChangeLabel?.(null); setSelected(null) }}>Cambia</Button>
        )}
      </div>
      {!selected ? (
        <>
          <Input
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
          <div className="max-h-64 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && (
                <li className="p-3 text-sm text-gray-500">Caricamento...</li>
              )}
              {emptyState && (
                <li className="p-3 text-sm text-gray-500">Nessun risultato</li>
              )}
              {!loading && results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeId(c.id)
                      onChangeLabel?.(c.title)
                      setSelected({ id: c.id, title: c.title })
                    }}
                    className="w-full text-left p-3 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{highlight(c.title, query)}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{highlight(c.slug, query)}</code>
                          <span className="truncate">Genitore: {c.parent?.title ? highlight(c.parent.title, query) : 'Nessuno'}</span>
                        </div>
                      </div>
                      <div className="shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">#{c.id}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm">Selezionato: <span className="font-medium">{selected.title}</span> (ID: {selected.id})</div>
          <Button type="button" variant="secondary" onClick={() => { onChangeId(''); onChangeLabel?.(null); setSelected(null) }}>Rimuovi</Button>
        </div>
      )}
    </div>
  )
}

export default CategoryPicker


