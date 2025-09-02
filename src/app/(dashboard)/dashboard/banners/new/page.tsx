'use client'

import { useEffect, useRef, useState } from 'react'
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
import { getAllowedPositions, getRequiredOrder, getRequiredImage, getAllowedOrders, getRequiredImageFor } from '@/config/banner-constraints'
import ImageCropperModal from '@/components/forms/image-cropper-modal'
import ArticleSelectModal from '@/components/forms/article-select-modal'
import CategorySelectModal from '@/components/forms/category-select-modal'

type NewBannerPageProps = { initialBanner?: Banner; isEdit?: boolean }

export default function NewBannerPage({ initialBanner, isEdit: isEditProp }: NewBannerPageProps) {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()
  const allowedRoles = ['PUBLISHER', 'ADVERTISING_MANAGER']
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

  // Selected labels (for visual summary)
  const [selectedArticleTitle, setSelectedArticleTitle] = useState<string | null>(null)
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string | null>(null)
  const [openArticleModal, setOpenArticleModal] = useState(false)
  const [openCategoryModal, setOpenCategoryModal] = useState(false)
  const skipNextModelResetRef = useRef(false)
  const isImageLocked = (!model || !position) && !(imagePreview || initialBanner?.banner_url)
  const [openCropper, setOpenCropper] = useState(false)
  const [pendingImageURL, setPendingImageURL] = useState<string | null>(null)
  const [pendingOriginalName, setPendingOriginalName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageDropRef = useRef<HTMLButtonElement | null>(null)

  // Precompila in edit (se arriviamo con un banner nel draft store)
  useEffect(() => {
    const src = initialBanner || null
    if (src) {
      // Prevent the subsequent model change effect from clearing prefilled selections
      skipNextModelResetRef.current = true
      setModel(src.model)
      setModelId(src.model_id != null ? Number(src.model_id) : '')
      setPosition(src.position)
      setOrder(src.order)
      setLink(src.link)
      setImagePreview(src.banner_url)
      // Prefill selected labels for summary/UI when editing
      if (src.model === 'Article' && src.model_title) {
        setSelectedArticleTitle(src.model_title)
      }
      if (src.model === 'Category' && src.model_title) {
        setSelectedCategoryTitle(src.model_title)
      }
    }
  }, [initialBanner])

  // On edit: if model title is missing, fetch it so the selection summary looks like after a modal pick
  useEffect(() => {
    let aborted = false
    async function fetchTitlesIfMissing() {
      const src = initialBanner || null
      if (!src) return
      // Category detail (has dedicated endpoint)
      if (src.model === 'Category' && !selectedCategoryTitle) {
        const id = (modelId || src.model_id) as number | ''
        if (id) {
          try {
            const res = await api.get<{ id: number; title: string }>(API_ENDPOINTS.CATEGORIES.DETAIL(id))
            if (!aborted) setSelectedCategoryTitle((res as any)?.data?.title || (res as any)?.title || null)
          } catch {}
        }
      }
      // Article best-effort via filter
      if (src.model === 'Article' && !selectedArticleTitle) {
        const id = (modelId || src.model_id) as number | ''
        if (id) {
          try {
            const qs = new URLSearchParams()
            qs.append('search', String(id))
            qs.append('per_page', '1')
            const res = await api.get<any>(`${API_ENDPOINTS.ARTICLES.FILTER}?${qs.toString()}`)
            const d = res?.data
            let title: string | null = null
            if (Array.isArray(d) && d[0]) title = d[0]?.title ?? null
            else if (Array.isArray(d?.data) && d.data[0]) title = d.data[0]?.title ?? null
            else if (Array.isArray(d?.data?.data) && d.data.data[0]) title = d.data.data[0]?.title ?? null
            if (!aborted && title) setSelectedArticleTitle(title)
          } catch {}
        }
      }
    }
    void fetchTitlesIfMissing()
    return () => { aborted = true }
  }, [initialBanner, modelId, selectedCategoryTitle, selectedArticleTitle])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const hasImage = Boolean(imageFile || imagePreview || initialBanner?.banner_url)
    // Usa l'ID selezionato oppure quello già presente in modifica
    const isModelIdRequired = model !== 'Home' && model !== 'Search'
    const effectiveModelId = isModelIdRequired ? (modelId || '') : ''
    if (!model || !position || !order || !link || !hasImage) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    if (isModelIdRequired && !effectiveModelId) {
      toast.error('Seleziona un elemento per il modello scelto')
      return
    }

    const formData = new FormData()
    // Build FormData depending on create/edit and include only changed fields for edit
      if (isEdit && initialBanner) {
      formData.append('_method', 'PUT')
      if (initialBanner.model !== model) formData.append('model', model)
        const initialModelIdNum = initialBanner.model_id ?? 0
        const nextModelIdNum = (model === 'Home' || model === 'Search') ? 0 : Number(effectiveModelId || 0)
      if (initialModelIdNum !== nextModelIdNum) formData.append('model_id', String(nextModelIdNum))
      if (initialBanner.position !== position) formData.append('position', position)
      if (initialBanner.order !== order) formData.append('order', String(order))
      if (initialBanner.link !== link) formData.append('link', link)
      if (imageFile) formData.append('image', imageFile)
      } else {
      formData.append('model', model)
        formData.append('model_id', String(effectiveModelId || 0))
      formData.append('position', position)
      formData.append('order', String(order))
      formData.append('link', link)
      if (imageFile) formData.append('image', imageFile)
    }

    setSubmitting(true)
    try {
      if (isEdit && initialBanner?.id) {
        // Use POST with _method=PUT for PHP multipart compatibility
        await api.post(API_ENDPOINTS.BANNERS.DETAIL(initialBanner.id), formData as any)
        toast.success('Banner aggiornato con successo')
      } else {
        await api.post(API_ENDPOINTS.BANNERS.ADD, formData as any)
        toast.success('Banner creato con successo')
      }
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

  // Effetti: reset stato selezioni quando cambia il modello (salta il prefill iniziale)
  const hasInitializedModelRef = useRef(false)
  useEffect(() => {
    if (!hasInitializedModelRef.current) {
      hasInitializedModelRef.current = true
      return
    }
    if (skipNextModelResetRef.current) {
      skipNextModelResetRef.current = false
      return
    }
    setModelId('')
    setSelectedArticleTitle(null)
    setSelectedCategoryTitle(null)
    const ro = getRequiredOrder(model)
    if (ro !== null) setOrder(ro)
    const allowed = getAllowedPositions(model)
    if (allowed.length === 1) setPosition(allowed[0])
    setImageFile(null)
    setImagePreview(null)
  }, [model])

  useEffect(() => {
    if (!model || !position) return
    const allowed = getAllowedPositions(model)
    if (!allowed.includes(position as BannerPosition)) {
      setPosition(allowed[0])
    }
  }, [model, position])

  function ModelIcon({ model }: { model: BannerModel }) {
    switch (model) {
      case 'Home':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h4a1 1 0 001-1v-4h4v4a1 1 0 001 1h4a1 1 0 001-1V10" />
          </svg>
        )
      case 'Search':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 110-16 8 8 0 010 16z" />
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
        subtitle={isEdit ? 'Rivedi i dettagli e aggiorna il banner' : 'Seleziona il target, definisci posizionamento e carica l’immagine'}
        icon={(
          <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Target</h3>
              <div className="text-xs text-gray-500">Scegli dove apparirà il banner</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectItem value="Search">
                      <div className="flex items-center gap-2"><ModelIcon model={'Search'} /> Ricerca</div>
                    </SelectItem>
                    <SelectItem value="Category">
                      <div className="flex items-center gap-2"><ModelIcon model={'Category'} /> Categoria</div>
                    </SelectItem>
                    <SelectItem value="Article">
                      <div className="flex items-center gap-2"><ModelIcon model={'Article'} /> Articolo</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                 <p className="text-xs text-gray-500">Home e Ricerca non richiedono associazioni. Articolo e Categoria richiedono una selezione.</p>
              </div>
              {model && model !== 'Home' && model !== 'Search' && (
                <div className="space-y-2">
                  <Label>ID Modello (avanzato)</Label>
                  <Input
                    type="number"
                    value={String(modelId || '')}
                    onChange={(e) => setModelId(Number(e.target.value) || '')}
                    placeholder="Es. 123"
                  />
                  <p className="text-xs text-gray-500">Facoltativo: puoi selezionare sotto dall’elenco per compilare automaticamente.</p>
                </div>
              )}
            </div>
            {model === 'Article' && (
              <div className="space-y-2">
                <Label className="block">Articolo</Label>
                {modelId ? (
                  <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-sm">Selezionato: <span className="font-medium">{selectedArticleTitle || '—'}</span> (ID: {modelId || '—'})</div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="default" onClick={() => setOpenArticleModal(true)}>Cambia</Button>
                      <Button type="button" variant="destructive" onClick={() => { setModelId(''); setSelectedArticleTitle(null) }}>Rimuovi</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" onClick={() => setOpenArticleModal(true)}>Scegli articolo</Button>
                )}
              </div>
            )}
            {model === 'Category' && (
              <div className="space-y-2">
                <Label className="block">Categoria</Label>
                {modelId ? (
                  <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-sm">Selezionato: <span className="font-medium">{selectedCategoryTitle || '—'}</span> (ID: {modelId || '—'})</div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="default" onClick={() => setOpenCategoryModal(true)}>Cambia</Button>
                      <Button type="button" variant="destructive" onClick={() => { setModelId(''); setSelectedCategoryTitle(null) }}>Rimuovi</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" onClick={() => setOpenCategoryModal(true)}>Scegli categoria</Button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Posizionamento</h3>
              <div className="text-xs text-gray-500">Definisci dove e in che ordine viene mostrato</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Posizione</Label>
                <Select value={position || ''} onValueChange={(v) => setPosition(v as BannerPosition)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona posizione" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllowedPositions(model).map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <span className={`w-2.5 h-2.5 rounded-sm ${pos === 'left' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <span className={`w-2.5 h-2.5 rounded-sm ${pos === 'center' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            <span className={`w-2.5 h-2.5 rounded-sm ${pos === 'right' ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          </span>
                          {pos === 'left' ? 'Sinistra' : pos === 'center' ? 'Centro' : 'Destra'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ordine</Label>
                {getAllowedOrders(model) ? (
                  <Select value={String(order || '')} onValueChange={(v) => setOrder(Number(v) || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona ordine" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllowedOrders(model)?.map((o) => (
                        <SelectItem key={o} value={String(o)}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || '')} placeholder="Es. 1" disabled={getRequiredOrder(model) !== null} />
                )}
                 {getRequiredOrder(model) !== null ? (
                   <p className="text-xs text-gray-500">Per {model} l'ordine è impostato automaticamente a {getRequiredOrder(model)}.</p>
                 ) : getAllowedOrders(model) ? (
                  <p className="text-xs text-gray-500">Per {model} puoi scegliere tra {getAllowedOrders(model)?.join(', ')}.</p>
                ) : (
                  <p className="text-xs text-gray-500">I numeri più piccoli vengono mostrati prima.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Destinazione</h3>
              <div className="text-xs text-gray-500">URL dove puntare il banner</div>
            </div>
            <div className="space-y-2">
              <Label>Link</Label>
              <Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
              <p className="text-xs text-gray-500">Usa un URL completo, ad esempio https://example.com/pagina</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Immagine</h3>
              {imageFile && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  Rimuovi
                </Button>
              )}
            </div>
            <div className="relative">
              {isImageLocked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-lg text-gray-700 dark:text-gray-200">
                  <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7a4 4 0 10-8 0v4m12 0V7a4 4 0 10-8 0m-2 4h12a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2z" />
                  </svg>
                  <div className="text-xs">Seleziona prima modello e posizione</div>
                </div>
              )}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isImageLocked ? 'opacity-50 pointer-events-none select-none filter blur-[1px]' : ''}`}>
                <button
                  ref={imageDropRef}
                  type="button"
                  aria-disabled={isImageLocked}
                  title={imagePreview ? 'Ingrandisci anteprima' : ''}
                  className="h-40 md:h-52 w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                  onClick={() => {
                    if (isImageLocked || !imagePreview) return
                    const w = window.open('', '_blank')
                    if (w) {
                      w.document.write(`<img src=\\"${imagePreview}\\" style=\\"max-width:100%;height:auto;\\" />`)
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      const file = files[0]
                      if (file.type.startsWith('image/')) {
                        // Handle the file directly here
                        if (!file) { setImageFile(null); setImagePreview(null); return }
                        if (!model || !position) {
                          toast.error('Seleziona prima modello e posizione')
                          return
                        }
                        const req = getRequiredImageFor(model, position as BannerPosition)
                        if (req) {
                          const isValid = new Promise<boolean>((resolve) => {
                            const img = new Image()
                            const url = URL.createObjectURL(file)
                            img.onload = () => {
                              const tolerance = 2
                              const widthOk = Math.abs(img.width - req.width) <= tolerance
                              const heightOk = Math.abs(img.height - req.height) <= tolerance
                              resolve(widthOk && heightOk)
                              URL.revokeObjectURL(url)
                            }
                            img.onerror = () => { resolve(false); URL.revokeObjectURL(url) }
                            img.src = url
                          })
                          isValid.then((valid) => {
                            if (!valid) {
                              // open cropper and let user fix it
                              const url = URL.createObjectURL(file)
                              setPendingImageURL(url)
                              setPendingOriginalName(file.name || null)
                              setOpenCropper(true)
                              // reset input to allow re-selecting the same file after cancel
                              if (fileInputRef.current) fileInputRef.current.value = ''
                              return
                            }
                            setImageFile(file)
                            const previewUrl = URL.createObjectURL(file)
                            setImagePreview(previewUrl)
                          })
                        } else {
                          setImageFile(file)
                          const previewUrl = URL.createObjectURL(file)
                          setImagePreview(previewUrl)
                        }
                      } else {
                        toast.error('Seleziona solo file immagine')
                      }
                    }
                  }}
                >
                {imagePreview || initialBanner?.banner_url ? (
                  <img src={imagePreview || (initialBanner?.banner_url as string)} alt="anteprima" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-xs text-gray-500">{model && position ? (getRequiredImageFor(model, position as BannerPosition) ? `Carica immagine ${getRequiredImageFor(model, position as BannerPosition)!.width}x${getRequiredImageFor(model, position as BannerPosition)!.height}` : 'Trascina o seleziona un’immagine') : 'Seleziona prima modello e posizione'}</div>
                  )}
                </button>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null
                      if (!file) { setImageFile(null); setImagePreview(null); return }
                      if (!model || !position) {
                        toast.error('Seleziona prima modello e posizione')
                        e.currentTarget.value = ''
                        return
                      }
                      const req = getRequiredImageFor(model, position as BannerPosition)
                      if (req) {
                        const isValid = await new Promise<boolean>((resolve) => {
                          const img = new Image()
                          const url = URL.createObjectURL(file)
                          img.onload = () => {
                            const tolerance = 2
                            const widthOk = Math.abs(img.width - req.width) <= tolerance
                            const heightOk = Math.abs(img.height - req.height) <= tolerance
                            resolve(widthOk && heightOk)
                            URL.revokeObjectURL(url)
                          }
                          img.onerror = () => { resolve(false); URL.revokeObjectURL(url) }
                          img.src = url
                        })
                        if (!isValid) {
                          // open cropper and let user fix it
                          const url = URL.createObjectURL(file)
                          setPendingImageURL(url)
                          setPendingOriginalName(file.name || null)
                          setOpenCropper(true)
                          // reset input to allow re-selecting the same file after cancel
                          if (fileInputRef.current) fileInputRef.current.value = ''
                          return
                        }
                      }
                      setImageFile(file)
                      const previewUrl = URL.createObjectURL(file)
                      setImagePreview(previewUrl)
                    }}
                    className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-white dark:file:bg-amber-600 dark:file:text-white"
                  required={!(imagePreview || initialBanner?.banner_url)}
                    disabled={isImageLocked}
                  ref={fileInputRef}
                  />
                    <p className="text-xs text-gray-500">{getRequiredImageFor(model, position as BannerPosition) ? `Richiesto: ${getRequiredImageFor(model, position as BannerPosition)!.width}x${getRequiredImageFor(model, position as BannerPosition)!.height}` : 'Consiglio: usa immagini ottimizzate.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold">Riepilogo</h3>
                <p className="text-xs text-gray-500">Controlla prima di salvare</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Modello</div>
                  <div className="flex items-center gap-2">
                    {model ? <ModelIcon model={model as BannerModel} /> : null}
                    <div className="text-sm font-medium">{model || '-'}</div>
                  </div>
                   {model !== 'Home' && model !== 'Search' && (
                    <div className="text-xs text-gray-500">Target ID: {modelId || '-'}</div>
                   )}
                  {model === 'Article' && (selectedArticleTitle || initialBanner?.model_title) && (
                    <div className="text-xs text-gray-500">Articolo: {selectedArticleTitle || initialBanner?.model_title}</div>
                  )}
                  {model === 'Category' && (selectedCategoryTitle || initialBanner?.model_title) && (
                    <div className="text-xs text-gray-500">Categoria: {selectedCategoryTitle || initialBanner?.model_title}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Posizionamento</div>
                  <div className="flex items-center gap-3">
                    {position ? <PlacementIcon position={position as BannerPosition} /> : null}
                    <span className="text-sm">{position || '-'}</span>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Ordine {String(order || '-')}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Link</div>
                  <div className="text-sm break-all">{link || '-'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Anteprima immagine</div>
                  <div className="h-32 w-full flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    {(imagePreview || initialBanner?.banner_url) ? (
                      <img src={imagePreview || (initialBanner?.banner_url as string)} alt="anteprima" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-xs text-gray-500">Nessuna immagine</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvataggio...' : isEdit ? 'Aggiorna banner' : 'Crea banner'}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </form>
      <ArticleSelectModal
        open={openArticleModal}
        onClose={() => setOpenArticleModal(false)}
        onSelect={(a) => { setModelId(a.id); setSelectedArticleTitle(a.title) }}
      />
      <CategorySelectModal
        open={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        onSelect={(c) => { setModelId(c.id); setSelectedCategoryTitle(c.title) }}
      />
      <ImageCropperModal
        open={openCropper}
        onClose={() => {
          setOpenCropper(false)
          if (pendingImageURL) URL.revokeObjectURL(pendingImageURL)
          setPendingImageURL(null)
          setPendingOriginalName(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
        imageURL={pendingImageURL || ''}
        requiredWidth={getRequiredImageFor(model, position as BannerPosition)?.width || 1440}
        requiredHeight={getRequiredImageFor(model, position as BannerPosition)?.height || 90}
        onCropped={(blob, previewURL) => {
          const baseName = pendingOriginalName || 'image'
          const filename = `cropped_${baseName}`
          setImageFile(new File([blob], filename, { type: blob.type }))
          setImagePreview(previewURL)
          setOpenCropper(false)
          setPendingOriginalName(null)
          setPendingImageURL(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
      />
    </div>
  )
}


