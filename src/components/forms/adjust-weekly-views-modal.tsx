'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/table/FormModal'
import ArticleSelectModal from '@/components/forms/article-select-modal'
import type { Article } from '@/hooks/use-articles'
import { api, ApiError } from '@/lib/api'
import { ARTICLE_STATUS_LABEL, statusColorClass } from '@/types/articles'
import { API_ENDPOINTS } from '@/config/endpoints'
import { toast } from 'sonner'

type AdjustWeeklyViewsModalProps = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AdjustWeeklyViewsModal({ open, onClose, onSuccess }: AdjustWeeklyViewsModalProps) {
  const [article, setArticle] = useState<Article | null>(null)
  const [delta, setDelta] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const pickArticle = useCallback(() => setPickerOpen(true), [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!article) {
      toast.error('Seleziona un articolo')
      return
    }
    const value = Number(delta)
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      toast.error('Delta deve essere un intero (anche negativo)')
      return
    }
    setSubmitting(true)
    try {
      await api.post(API_ENDPOINTS.ARTICLES.ADJUST_VIEWS(article.id), { delta: value })
      toast.success('Visite settimanali aggiornate')
      onSuccess?.()
      onClose()
      setArticle(null)
      setDelta('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        toast.error('Delta non valido')
      } else if (error instanceof ApiError && error.status === 401) {
        toast.error('Non autorizzato')
      } else {
        toast.error('Operazione non riuscita')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <FormModal
        isOpen={open}
        onClose={onClose}
        title="Modifica articoli in evidenza"
        subtitle="Cerca un articolo e regola le visite settimanali"
        onSubmit={handleSubmit}
        submitLabel="Salva"
        variant="blue"
        loading={submitting}
        icon={(
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
        )}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Articolo</label>
            {article ? (
              <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3 gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" title={article.title}>{article.title}</div>
                  <div className="text-xs text-gray-500">ID: {article.id}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">
                    Autore: {article.author?.name || '-'}{(() => { const c = Array.isArray(article.categories) ? article.categories[0] : undefined; return c ? ` • Categoria: ${c.title}` : '' })()} {typeof article.weekly_views === 'number' ? ` • Visite settimanali: ${article.weekly_views}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {article.status ? (
                    <span
                      title={ARTICLE_STATUS_LABEL[article.status]}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${(() => {
                        const color = statusColorClass(article.status)
                        if (color.includes('green')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ring-green-300/60 dark:ring-green-700/60'
                        if (color.includes('gray') || color.includes('zinc') || color.includes('slate')) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 ring-gray-300/60 dark:ring-gray-700/60'
                        if (color.includes('amber')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 ring-amber-300/60 dark:ring-amber-700/60'
                        if (color.includes('red')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ring-red-300/60 dark:ring-red-700/60'
                        if (color.includes('blue')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-blue-300/60 dark:ring-blue-700/60'
                        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 ring-gray-300/60 dark:ring-gray-700/60'
                      })()}`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${statusColorClass(article.status)}`} />
                      {ARTICLE_STATUS_LABEL[article.status]}
                    </span>
                  ) : null}
                  {article.show_link ? (
                    <a
                      href={article.show_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
                    >
                      Vedi articolo
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0 0L10 21l-7-7L14 3z" /></svg>
                    </a>
                  ) : null}
                  <Button type="button" variant="secondary" onClick={() => setArticle(null)}>Rimuovi</Button>
                </div>
              </div>
            ) : (
              <Button type="button" className='mx-2' onClick={pickArticle}>Cerca articolo</Button>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Delta visite settimanali</label>
            <Input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="Es. 10 o -5"
              inputMode="numeric"
            />
            <p className="text-xs text-gray-500">Accetta numeri interi positivi o negativi</p>
          </div>
        </div>
      </FormModal>

      <ArticleSelectModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(a) => { setArticle(a); setPickerOpen(false) }}
        usePublicFilter
      />
    </>
  )
}


