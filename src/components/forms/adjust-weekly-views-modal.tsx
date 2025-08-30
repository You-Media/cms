'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/table/FormModal'
import ArticleSelectModal from '@/components/forms/article-select-modal'
import type { Article } from '@/hooks/use-articles'
import { api, ApiError } from '@/lib/api'
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
              <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" title={article.title}>{article.title}</div>
                  <div className="text-xs text-gray-500">ID: {article.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setArticle(null)}>Cambia</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={pickArticle}>Cerca articolo</Button>
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
      />
    </>
  )
}


