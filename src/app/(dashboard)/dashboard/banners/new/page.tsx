'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS } from '@/config/endpoints'
import { api, ApiError } from '@/lib/api'
import type { Banner, BannerModel, BannerPosition } from '@/types/banners'
import { toast } from 'sonner'

type NewBannerPageProps = { initialBanner?: Banner; isEdit?: boolean }

export default function NewBannerPage({ initialBanner, isEdit: isEditProp }: NewBannerPageProps) {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()
  const allowedRoles = ['PUBLISHER', 'EDITOR_IN_CHIEF', 'ADVERTISING_MANAGER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)
  const canCreate = hasPermission('create_banner')

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  if (!canCreate) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per creare nuovi banner.</p>
      </div>
    )
  }

  const [model, setModel] = useState<BannerModel | ''>('')
  const [modelId, setModelId] = useState<number | ''>('')
  const [position, setPosition] = useState<BannerPosition | ''>('')
  const [order, setOrder] = useState<number | ''>('')
  const [link, setLink] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = isEditProp ?? !!initialBanner

  // Precompila in edit (se arriviamo con un banner nel draft store)
  useEffect(() => {
    const src = initialBanner || null
    if (src) {
      setModel(src.model)
      setModelId(typeof src.model_id === 'number' ? src.model_id : '')
      setPosition(src.position)
      setOrder(src.order)
      setLink(src.link)
      setImagePreview(src.banner_url)
    }
  }, [initialBanner])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!model || !position || !order || !link || !imageFile) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const formData = new FormData()
    formData.append('model', model)
    formData.append('model_id', String(modelId || 0))
    formData.append('position', position)
    formData.append('order', String(order))
    formData.append('link', link)
    formData.append('image', imageFile)

    setSubmitting(true)
    try {
      await api.post(API_ENDPOINTS.BANNERS.ADD, formData as any, {
        // Sovrascrive header Content-Type per FormData
        // fetch lo gestisce automaticamente se body è FormData, ma rimuoviamo JSON header lato client
      } as any)
      toast.success('Banner creato con successo')
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          toast.error('Non sei autorizzato a creare banner')
        } else if (error.status === 422) {
          toast.error('Dati non validi - verifica i campi')
        } else if (error.status === 500) {
          toast.error('Qualcosa è andato storto. Riprova più tardi.')
        } else {
          toast.error('Creazione non riuscita')
        }
      } else {
        toast.error('Creazione non riuscita')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Helpers icone come nella lista/filtri
  function PlacementIcon({ position }: { position: BannerPosition }) {
    const base = 'w-2.5 h-2.5 rounded-sm'
    const isLeft = position === 'left'
    const isCenter = position === 'center'
    const isRight = position === 'right'
    return (
      <span className="flex items-center gap-1" aria-label={`Posizione: ${position}`}>
        <span className={`${base} ${isLeft ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <span className={`${base} ${isCenter ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <span className={`${base} ${isRight ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
      </span>
    )
  }

  function ModelIcon({ model }: { model: BannerModel }) {
    switch (model) {
      case 'Home':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h4a1 1 0 001-1v-4h4v4a1 1 0 001 1h4a1 1 0 001-1V10" />
          </svg>
        )
      case 'Article':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6M9 16h6" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V7a2 2 0 00-2-2H7a2 2 0 00-2 2v4" />
          </svg>
        )
    }
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title={isEdit ? 'Modifica banner' : 'Nuovo banner'}
        subtitle={isEdit ? 'Aggiorna i campi del banner selezionato' : 'Compila i campi richiesti per creare un nuovo banner'}
        icon={(
          <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      />

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Modello</Label>
            <Select value={model || ''} onValueChange={(v) => setModel(v as BannerModel)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona modello" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Home">
                  <div className="flex items-center gap-2"><ModelIcon model={'Home'} /> Home</div>
                </SelectItem>
                <SelectItem value="Category">
                  <div className="flex items-center gap-2"><ModelIcon model={'Category'} /> Categoria</div>
                </SelectItem>
                <SelectItem value="Article">
                  <div className="flex items-center gap-2"><ModelIcon model={'Article'} /> Articolo</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>ID Modello (model_id)</Label>
            <Input type="number" value={modelId} onChange={(e) => setModelId(Number(e.target.value) || '')} placeholder="Es. 123" />
          </div>
          <div className="space-y-2">
            <Label>Posizione</Label>
            <Select value={position || ''} onValueChange={(v) => setPosition(v as BannerPosition)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona posizione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left"><div className="flex items-center gap-2"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /></span> Sinistra</div></SelectItem>
                <SelectItem value="center"><div className="flex items-center gap-2"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /></span> Centro</div></SelectItem>
                <SelectItem value="right"><div className="flex items-center gap-2"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /></span> Destra</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ordine</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || '')} placeholder="Es. 1" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Link</Label>
            <Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Immagine</Label>
            <div className="flex items-start gap-6">
              <button
                type="button"
                title={imagePreview ? 'Ingrandisci anteprima' : ''}
                className="h-24 w-[420px] flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                onClick={() => {
                  if (!imagePreview) return
                  const w = window.open('', '_blank')
                  if (w) {
                    w.document.write(`<img src="${imagePreview}" style="max-width:100%;height:auto;" />`)
                  }
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="anteprima" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-xs text-gray-500">Nessuna immagine</div>
                )}
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setImageFile(file)
                  if (file) {
                    const url = URL.createObjectURL(file)
                    setImagePreview(url)
                  }
                }}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900/20 dark:file:text-amber-300"
                required={!imagePreview}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvataggio...' : isEdit ? 'Aggiorna banner' : 'Crea banner'}
          </Button>
        </div>
      </form>
    </div>
  )
}


