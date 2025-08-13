'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import CategoryPicker from '@/components/forms/category-picker'
import { useArticles, type Article } from '@/hooks/use-articles'

type ArticlePickerProps = {
  valueId: number | ''
  onChangeId: (id: number | '') => void
  onChangeLabel?: (label: string | null) => void
  label?: string
  placeholder?: string
  autoFocus?: boolean
}

export function ArticlePicker({ valueId, onChangeId, onChangeLabel, label = 'Seleziona articolo', placeholder = 'Cerca per titolo...', autoFocus = false }: ArticlePickerProps) {
  const { results, loading, search } = useArticles()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [selected, setSelected] = useState<{ id: number; title: string } | null>(null)

  // Keep selected summary in sync with external value
  useEffect(() => {
    if (!valueId) {
      setSelected(null)
      return
    }
    if (selected?.id === valueId) return
    const found = results.find(r => r.id === valueId)
    if (found) {
      setSelected({ id: found.id, title: found.title })
    } else {
      setSelected({ id: valueId as number, title: `ID ${valueId}` })
    }
  }, [valueId, results])

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => {
      search({
        search: query || undefined,
        category_id: categoryId || undefined,
        sort_by: sortBy || undefined,
        per_page: 10,
        page: 1,
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [query, sortBy, categoryId, search])

  const emptyState = useMemo(() => !loading && results.length === 0, [loading, results])

  function formatDate(input?: string) {
    if (!input) return ''
    // Fallback robusto per Safari: estrai la parte data YYYY-MM-DD ovunque si trovi
    const m = input.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const [, y, mo, d] = m
      return `${d}/${mo}/${y}`
    }
    const dt = new Date(input)
    if (Number.isNaN(dt.getTime())) return ''
    try {
      return dt.toLocaleDateString('it-IT')
    } catch {
      // come ultima istanza mostra i primi 10 caratteri (YYYY-MM-DD)
      return typeof input === 'string' ? input.slice(0, 10) : ''
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              autoFocus={autoFocus}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />
            <div>
              <CategoryPicker
                valueId={categoryId}
                onChangeId={(id) => setCategoryId(id)}
                label="Filtra per categoria"
                placeholder="Digita per cercare una categoria..."
              />
            </div>
            <Select value={sortBy || '__NONE__'} onValueChange={(v) => setSortBy(v === '__NONE__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordina per (opzionale)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Nessuno</SelectItem>
                <SelectItem value="recenti">Recenti</SelectItem>
                <SelectItem value="popolari">Popolari</SelectItem>
                <SelectItem value="alfabetico">Alfabetico</SelectItem>
                <SelectItem value="published_at">Data pubblicazione</SelectItem>
                <SelectItem value="priority">Priorità</SelectItem>
                <SelectItem value="title">Titolo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-64 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && (
                <li className="p-3 text-sm text-gray-500">Caricamento...</li>
              )}
              {emptyState && (
                <li className="p-3 text-sm text-gray-500">Nessun risultato</li>
              )}
              {!loading && results.map((a: Article) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeId(a.id)
                      onChangeLabel?.(a.title)
                      setSelected({ id: a.id, title: a.title })
                    }}
                    className="w-full text-left p-3 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.title}</div>
                        <div className="text-xs text-gray-500">
                          ID: {a.id}
                          {(() => { const d = formatDate(a.published_at); return d ? ` • Pubblicato: ${d}` : '' })()}
                        </div>
                      </div>
                      <div className="shrink-0 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">Articolo</div>
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

export default ArticlePicker


