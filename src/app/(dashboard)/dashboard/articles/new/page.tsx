"use client"

// Deterministic color palette for category parent-based chips (shared with edit page)
const CATEGORY_COLOR_CLASSES = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
]

function getCategoryChipClasses(cat: { parent?: { slug?: string | null } | null }) {
  const key = (cat?.parent?.slug || 'root').toString().toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % CATEGORY_COLOR_CLASSES.length
  return CATEGORY_COLOR_CLASSES[idx]
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { useItalyGeo } from '@/hooks/use-italy-geo'
import CategorySelectModal from '@/components/forms/category-select-modal'
import TagSelectModal from '@/components/forms/tag-select-modal'
import AuthorSelectModal from '@/components/forms/author-select-modal'
import ImageCropperModal from '@/components/forms/image-cropper-modal'
import RichTextEditor from '@/components/forms/rich-text-editor'
import SEOAssistant from '@/components/forms/seo-assistant'
import { api, ApiError } from '@/lib/api'
import { API_ENDPOINTS } from '@/config/endpoints'
import { APP_ROUTES } from '@/config/routes'

type ArticleType = '' | 'Notizia' | 'Editoriale'

export default function NewArticlePage() {
  const router = useRouter()
  const { selectedSite, hasAnyRole, hasPermission, hasAnyPermission, user } = useAuth()
  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)
  const canCreate = hasAnyPermission(['create_content'])

  // Form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [regionName, setRegionName] = useState('')
  const [provinceName, setProvinceName] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [metaKeywords, setMetaKeywords] = useState('')
  const [priority, setPriority] = useState<number | ''>('')
  const [isSearchable, setIsSearchable] = useState(true)
  const [videoUrl, setVideoUrl] = useState('')
  const [type, setType] = useState<ArticleType>('Notizia')

  // Author handling: journalist defaults to self
  const isJournalist = hasAnyRole(['JOURNALIST'])
  const [authorId, setAuthorId] = useState<number | ''>('')
  const [authorName, setAuthorName] = useState<string | null>(null)

  useEffect(() => {
    if (isJournalist && user?.id) {
      setAuthorId(user.id)
      setAuthorName(user.profile?.full_name || user.email || `#${user.id}`)
    }
  }, [isJournalist, user])

  // Categories multi-select via modal
  const [openCategoryModal, setOpenCategoryModal] = useState(false)
  const [openAuthorModal, setOpenAuthorModal] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: number; title: string; parent: { id: number; title: string; slug: string } | null }>>([])
  const categoryIds = useMemo(() => selectedCategories.map((c) => c.id), [selectedCategories])

  // Tags multi-select via simple search (best-effort)
  const [openTagModal, setOpenTagModal] = useState(false)
  const [selectedTags, setSelectedTags] = useState<Array<{ id: number; name: string }>>([])
  const tagIds = useMemo(() => selectedTags.map((t) => t.id), [selectedTags])

  // Geo autocomplete like list page
  const { searchRegions, searchProvinces } = useItalyGeo()
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false)

  // Cover upload + cropper (optional)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverCaption, setCoverCaption] = useState('')
  const [openCropper, setOpenCropper] = useState(false)
  const [pendingImageURL, setPendingImageURL] = useState<string | null>(null)
  const [pendingOriginalName, setPendingOriginalName] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  // Gallery upload
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)

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
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per creare articoli.</p>
      </div>
    )
  }

  function addCategory(cat: { id: number; title: string; parent: { id: number; title: string; slug: string } | null }) {
    setSelectedCategories((prev) => prev.some((c) => c.id === cat.id) ? prev : [...prev, { id: cat.id, title: cat.title, parent: cat.parent }])
  }
  function removeCategory(id: number) {
    setSelectedCategories((prev) => prev.filter((c) => c.id !== id))
  }
  function addTag(tag: { id: number; name: string }) {
    setSelectedTags((prev) => prev.some((t) => t.id === tag.id) ? prev : [...prev, tag])
  }
  function removeTag(id: number) {
    setSelectedTags((prev) => prev.filter((t) => t.id !== id))
  }

  function onCoverSelected(file: File | null) {
    if (!file) {
      setCoverFile(null)
      setCoverPreview(null)
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    // Validate size 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La cover supera 5MB')
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    // Offer cropping
    const url = URL.createObjectURL(file)
    setPendingImageURL(url)
    setPendingOriginalName(file.name || 'cover.jpg')
    setOpenCropper(true)
  }

  function onGallerySelected(files: FileList | null) {
    if (!files || files.length === 0) return
    const next: File[] = []
    const nextPrev: string[] = []
    // captions removed
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`Un file supera 5MB: ${f.name}`)
        continue
      }
      next.push(f)
      nextPrev.push(URL.createObjectURL(f))
      // captions removed
    }
    setGalleryFiles((prev) => [...prev, ...next])
    setGalleryPreviews((prev) => [...prev, ...nextPrev])
  }

  function removeGalleryIndex(idx: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  function validate(): boolean {
    const contentText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s+/g, '')
    if (!title.trim() || contentText.length === 0) {
      toast.error('Compila i campi obbligatori: titolo e contenuto')
      return false
    }
    if (!authorId) {
      toast.error('Seleziona un autore')
      return false
    }
    if (categoryIds.length === 0) {
      toast.error('Seleziona almeno una categoria')
      return false
    }
    if (!publishedAt) {
      toast.error('La data di pubblicazione è obbligatoria')
      return false
    }
    if (metaDescription && metaDescription.length > 160) {
      toast.error('Meta description troppo lunga (max 160)')
      return false
    }
    if (priority !== '' && (priority < 0 || priority > 10)) {
      toast.error('Priorità deve essere tra 0 e 10')
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const formData = new FormData()
    formData.append('title', title)
    if (subtitle) formData.append('subtitle', subtitle)
    formData.append('content', content)
    if (regionName) formData.append('region_name', regionName)
    if (provinceName) formData.append('province_name', provinceName)
    if (publishedAt) formData.append('published_at', publishedAt)
    if (metaTitle) formData.append('meta_title', metaTitle)
    if (metaDescription) formData.append('meta_description', metaDescription)
    if (metaKeywords) formData.append('meta_keywords', metaKeywords)
    if (priority !== '') formData.append('priority', String(priority))
    formData.append('is_searchable', isSearchable ? '1' : '0')
    formData.append('author_id', String(authorId))
    if (videoUrl) formData.append('video_url', videoUrl)
    if (type) formData.append('type', type)
    if (coverFile) formData.append('cover', coverFile)
    categoryIds.forEach((id) => formData.append('category_ids[]', String(id)))
    tagIds.forEach((id) => formData.append('tag_ids[]', String(id)))
    galleryFiles.forEach((f) => formData.append('gallery[]', f))

    setSubmitting(true)
    try {
      await api.post(API_ENDPOINTS.ARTICLES.CREATE, formData as any, undefined, { suppressGlobalToasts: true })
      toast.success('Articolo creato con successo')
      router.push(APP_ROUTES.DASHBOARD.ARTICLES.LIST)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) toast.error('Non sei autorizzato a creare articoli')
        else if (error.status === 422) toast.error(error.message || 'Dati non validi')
        else toast.error('Creazione non riuscita')
      } else {
        toast.error('Creazione non riuscita')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Nuovo articolo"
        subtitle="Compila i campi e carica i media necessari"
        icon={(
          <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6M9 16h6" />
          </svg>
        )}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Dettagli</h3>
              <div className="text-xs text-gray-500">Campi obbligatori contrassegnati</div>
            </div>
            <div className="space-y-2">
              <Label>Titolo *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Sottotitolo</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sottotitolo" maxLength={255} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Contenuto *</h3>
              <div className="text-xs text-gray-500">Testo dell'articolo</div>
            </div>
            <div className="space-y-2">
              <RichTextEditor value={content} onChange={setContent} placeholder="Scrivi il contenuto dell'articolo..." minHeight={640} />
            </div>
          </div>

        </div>

        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Autore</h3>
              <div className="text-xs text-gray-500">Seleziona l'autore</div>
            </div>
            {!isJournalist ? (
              <div className="space-y-2">
                <Label>Autore</Label>
                <div className="relative">
                  <Input
                    readOnly
                    value={authorName ? authorName : (authorId ? `ID ${authorId}` : '')}
                    placeholder="Cerca autore..."
                    onClick={() => setOpenAuthorModal(true)}
                    onFocus={() => setOpenAuthorModal(true)}
                  />
                  {authorId ? (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => { setAuthorId(''); setAuthorName(null) }}
                      aria-label="Rimuovi autore selezionato"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-300">Assegnato automaticamente a: <span className="font-medium">{authorName || 'Tu'}</span></div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Media</h3>
              {coverFile && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); if (coverInputRef.current) coverInputRef.current.value = '' }}
                >
                  Rimuovi cover
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cover</Label>
                <div className="h-40 w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} alt="cover" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-xs text-gray-500">Trascina o seleziona un’immagine (max 5MB)</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onCoverSelected(e.target.files?.[0] || null)}
                    ref={coverInputRef}
                    className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-white dark:file:bg-amber-600 dark:file:text-white"
                  />
                  {coverPreview ? (
                    <Button type="button" variant="secondary" onClick={() => { if (coverPreview) { const w = window.open('', '_blank'); if (w) { w.document.write(`<img src=\"${coverPreview}\" style=\"max-width:100%;height:auto;\" />`) } } }}>Anteprima</Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Galleria (multipla)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {galleryPreviews.map((src, idx) => (
                    <div key={`${src}-${idx}`} className="relative h-24 w-full rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <img src={src} alt={`g-${idx}`} className="h-full w-full object-cover" />
                      <button type="button" className="absolute top-1 right-1 bg-white/90 dark:bg-gray-900/80 rounded-full p-1" onClick={() => removeGalleryIndex(idx)} aria-label="Rimuovi">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-[10px] p-1 truncate">Anteprima</div>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => onGallerySelected(e.target.files)}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-white dark:file:bg-amber-600 dark:file:text-white"
                />
                <p className="text-xs text-gray-500">Max 5MB per file</p>
                {/* captions removed */}
                <div className="space-y-2 mt-2">
                  <Label>Video URL</Label>
                  <Input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." maxLength={2048} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Categorie *</h3>
              <Button type="button" size="sm"  onClick={() => setOpenCategoryModal(true)}>Aggiungi</Button>
            </div>
            {selectedCategories.length === 0 ? (
              <div className="text-sm text-gray-500">Nessuna categoria selezionata</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((c) => (
                  <span key={c.id} className={`inline-flex items-center gap-2 px-2.5 py-0.5 text-xs font-medium rounded-full ${getCategoryChipClasses(c)}`}>
                    {c.title}
                    <button type="button" className="ml-1" onClick={() => removeCategory(c.id)} aria-label="Rimuovi categoria">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Tag</h3>
              <Button type="button" size="sm" onClick={() => setOpenTagModal(true)}>Aggiungi</Button>
            </div>
            {selectedTags.length === 0 ? (
              <div className="text-sm text-gray-500">Nessun tag selezionato</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {t.name}
                    <button type="button" className="ml-1" onClick={() => removeTag(t.id)} aria-label="Rimuovi tag">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">SEO e opzioni</h3>
              <div className="text-xs text-gray-500">Meta</div>
            </div>
            <div className="space-y-4">
              {/* Focus keyphrase removed */}
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta title</Label>
                <Input id="meta_title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={255} placeholder="Titolo SEO" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta description</Label>
                <textarea id="meta_description" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={160} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm min-h-[100px]" placeholder="Max 160 caratteri" />
              </div>
              <div className="space-y-2">
                <Label>Meta keywords</Label>
                <Input value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} maxLength={255} placeholder="Parole chiave separate da virgola" />
              </div>
              <div className="space-y-2">
                <Label>Indicizzabile</Label>
                <div className="flex items-center gap-3">
                  <input id="is_searchable" type="checkbox" checked={isSearchable} onChange={(e) => setIsSearchable(e.target.checked)} />
                  <label htmlFor="is_searchable" className="text-sm text-gray-700 dark:text-gray-300">Consenti ricerca</label>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <SEOAssistant
                  title={metaTitle}
                  description={metaDescription}
                  contentHTML={content}
                  pageTitle={title}
                  subtitle={subtitle}
                  keywords={metaKeywords}
                  locale="it_IT"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Localizzazione</h3>
              <div className="text-xs text-gray-500">Regione e provincia</div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Regione</Label>
                <div className="relative">
                  <Input
                    value={regionName}
                    onChange={(e) => { setRegionName(e.target.value); setProvinceName('') }}
                    onFocus={() => setShowRegionDropdown(true)}
                    onBlur={() => setTimeout(() => setShowRegionDropdown(false), 100)}
                    placeholder="Es. Lazio"
                    maxLength={255}
                  />
                  {showRegionDropdown && regionName && searchRegions(regionName).slice(0, 6).length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
                      {searchRegions(regionName).slice(0, 6).map((r) => (
                        <button
                          key={r.name}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => { setRegionName(r.name); setProvinceName(''); setShowRegionDropdown(false) }}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <div className="relative">
                  <Input
                    value={provinceName}
                    onChange={(e) => { setProvinceName(e.target.value); setShowProvinceDropdown(true) }}
                    onFocus={() => setShowProvinceDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 100)}
                    placeholder="Es. Frosinone"
                    maxLength={255}
                  />
                  {showProvinceDropdown && provinceName && searchProvinces(provinceName, regionName || undefined).slice(0, 6).length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-auto" onMouseDown={(e) => e.preventDefault()}>
                      {searchProvinces(provinceName, regionName || undefined).slice(0, 6).map((p) => (
                        <button
                          key={`${p.name}-${p.abbreviation || ''}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => { setProvinceName(p.name); if (!regionName && p.regionName) setRegionName(p.regionName); setShowProvinceDropdown(false) }}
                        >
                          {p.name}{p.abbreviation ? ` (${p.abbreviation})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Impostazioni</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as ArticleType)} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Notizia">Notizia</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Il tipo è impostato a Notizia</p>
              </div>
              <div className="space-y-2">
                <Label>Data pubblicazione *</Label>
                <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Crea articolo'}</Button>
            </div>
          </div>
        </aside>
      </form>

      <CategorySelectModal
        open={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        onSelect={(c) => { addCategory({ id: c.id, title: c.title, parent: c.parent ? { id: c.parent.id, title: c.parent.title, slug: c.parent.slug } : null }) }}
      />
      <TagSelectModal
        open={openTagModal}
        onClose={() => setOpenTagModal(false)}
        onSelect={(t) => { addTag(t) }}
      />
      <AuthorSelectModal
        open={openAuthorModal}
        onClose={() => setOpenAuthorModal(false)}
        onSelect={(u) => { setAuthorId(u.id); setAuthorName(u.fullName) }}
        roles={['Journalist']}
      />
      <ImageCropperModal
        open={openCropper}
        onClose={() => {
          setOpenCropper(false)
          if (pendingImageURL) URL.revokeObjectURL(pendingImageURL)
          setPendingImageURL(null)
          setPendingOriginalName(null)
          if (coverInputRef.current) coverInputRef.current.value = ''
        }}
        imageURL={pendingImageURL || ''}
        requiredWidth={1440}
        requiredHeight={810}
        onCropped={(blob, previewURL) => {
          const baseName = pendingOriginalName || 'cover'
          const filename = `cropped_${baseName}`
          setCoverFile(new File([blob], filename, { type: blob.type }))
          setCoverPreview(previewURL)
          setOpenCropper(false)
          setPendingOriginalName(null)
          setPendingImageURL(null)
        }}
      />
    </div>
  )
}
