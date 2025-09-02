'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

// Simple in-memory cache to avoid duplicate fetches in React StrictMode (dev)
const articleDetailCache = new Map<string, any>()
// Track in-flight loads to dedupe concurrent requests
const articleDetailInflight = new Map<string, Promise<any>>()

// Deterministic color palette for category parent-based chips
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

type ExistingGalleryItem = {
  id: number
  url: string
  caption?: string
}

type InitialSnapshot = {
  title: string
  subtitle: string
  content: string
  region_name: string
  province_name: string
  published_at: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  priority: number | ''
  is_searchable: boolean
  author_id: number | ''
  video_url: string
  type: ArticleType
  category_ids: number[]
  tag_ids: number[]
}

export default function EditArticlePageImpl() {
  const params = useParams() as { id?: string }
  const id = params?.id
  const router = useRouter()
  const { selectedSite, hasAnyRole, hasPermission, hasAnyRole: hasAnyRoleFn, user } = useAuth()
  const allowedRoles = ['JOURNALIST', 'EDITOR_IN_CHIEF', 'PUBLISHER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles)
  const canEdit = hasPermission('edit_content')
  const canDelete = hasPermission('delete_content')
  const showPriorityField = hasAnyRole(['PUBLISHER'])

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

  // Author
  const isJournalist = hasAnyRoleFn(['JOURNALIST'])
  const [authorId, setAuthorId] = useState<number | ''>('')
  const [authorName, setAuthorName] = useState<string | null>(null)

  // Categories
  const [openCategoryModal, setOpenCategoryModal] = useState(false)
  const [openAuthorModal, setOpenAuthorModal] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: number; title: string; parent: { id: number; title: string; slug: string } | null }>>([])
  const categoryIds = useMemo(() => selectedCategories.map((c) => c.id), [selectedCategories])

  // Tags
  const [openTagModal, setOpenTagModal] = useState(false)
  const [selectedTags, setSelectedTags] = useState<Array<{ id: number; name: string }>>([])
  const tagIds = useMemo(() => selectedTags.map((t) => t.id), [selectedTags])

  // Geo utils
  const { searchRegions, searchProvinces } = useItalyGeo()
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false)

  // Cover
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [openCropper, setOpenCropper] = useState(false)
  const [pendingImageURL, setPendingImageURL] = useState<string | null>(null)
  const [pendingOriginalName, setPendingOriginalName] = useState<string | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const coverDropRef = useRef<HTMLDivElement | null>(null)

  // Gallery (existing + new)
  const [existingGallery, setExistingGallery] = useState<ExistingGalleryItem[]>([])
  const [galleryToRemove, setGalleryToRemove] = useState<number[]>([])
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const galleryDropRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  function isDefaultCover(url: string | null): boolean {
    if (!url) return true
    const u = url.toLowerCase()
    return u.includes('default') || u.includes('placeholder') || u.includes('no-image') || u.includes('noimage')
  }

  // Snapshot initial values for diff
  const initialRef = useRef<InitialSnapshot | null>(null)

  useEffect(() => {
    if (!id) return
    const key = String(id)
    let active = true

    // If cached, hydrate synchronously and skip fetch
    const cached = articleDetailCache.get(key)
    if (cached) {
      try {
        const article = cached
        const titleV = article?.title ?? ''
        const subtitleV = article?.subtitle ?? ''
        const contentV = article?.content ?? ''
        const regionV =
          typeof article?.region_name === 'string' && article.region_name
            ? article.region_name
            : (article?.region && typeof article.region === 'object' && typeof article.region.name === 'string')
              ? article.region.name
              : typeof article?.region === 'string'
                ? article.region
                : ''
        const provinceV =
          typeof article?.province_name === 'string' && article.province_name
            ? article.province_name
            : (article?.province && typeof article.province === 'object' && typeof article.province.name === 'string')
              ? article.province.name
              : typeof article?.province === 'string'
                ? article.province
                : ''
        const publishedV = article?.published_at ? String(article.published_at).replace(' ', 'T').slice(0, 16) : ''
        const metaTitleV = article?.meta_title ?? ''
        const metaDescriptionV = article?.meta_description ?? ''
        const metaKeywordsV = article?.meta_keywords ?? ''
        const priorityV: number | '' = (typeof article?.priority === 'number') ? article.priority : ''
        const isSearchableV = article?.is_searchable === true || article?.is_searchable === 1 || article?.is_searchable === '1'
        const authorIdV: number | '' = article?.author?.id ?? article?.author_id ?? ''
        const authorNameV: string | null = article?.author?.name ?? article?.author_name ?? null
        const videoUrlV = article?.video_url ?? ''
        const typeV: ArticleType = 'Notizia'
        const catList = Array.isArray(article?.categories) ? article.categories : []
        const selCats = catList.map((c: any) => ({
          id: Number(c.id),
          title: c.title || c.name || `#${c.id}`,
          parent: (c?.parent && typeof c.parent === 'object')
            ? { id: Number(c.parent.id), title: String(c.parent.title || ''), slug: String(c.parent.slug || '') }
            : null,
        }))
        const tagList = Array.isArray(article?.tags) ? article.tags : []
        const selTags = tagList.map((t: any) => ({ id: Number(t.id), name: t.name || t.title || `#${t.id}` }))
        let coverPrev = article?.cover_preview || article?.cover_url || null
        const galleryList = Array.isArray(article?.gallery) ? article.gallery : []
        let exGallery: ExistingGalleryItem[] = galleryList
          .map((g: any) => ({ id: Number(g.id), url: g.preview_url || g.url || g.path || '', caption: g.caption || '' }))
          .filter((g: ExistingGalleryItem) => g.url)
        // Se la gallery esiste, la prima immagine è la cover
        if (Array.isArray(galleryList) && galleryList.length > 0) {
          const first = galleryList[0]
          const firstUrl = first?.preview_url || first?.url || first?.path || null
          if (firstUrl) coverPrev = firstUrl
        }
        // Se la gallery è vuota, mostra almeno la cover come primo elemento
        if (exGallery.length === 0 && coverPrev) {
          exGallery = [{ id: 0, url: coverPrev, caption: 'Cover' }]
        }

        if (!active) return

        setTitle(titleV)
        setSubtitle(subtitleV)
        setContent(contentV)
        setRegionName(regionV)
        setProvinceName(provinceV)
        setPublishedAt(publishedV)
        setMetaTitle(metaTitleV)
        setMetaDescription(metaDescriptionV)
        setMetaKeywords(metaKeywordsV)
        setPriority(priorityV)
        setIsSearchable(isSearchableV)
        setAuthorId(authorIdV)
        setAuthorName(authorNameV)
        setVideoUrl(videoUrlV)
        setType(typeV)
        setSelectedCategories(selCats)
        setSelectedTags(selTags)
        setCoverPreview(coverPrev)
        setExistingGallery(exGallery)
        setGalleryToRemove([])
        setGalleryFiles([])
        setGalleryPreviews([])
        setRemoveCover(false)

        const snapshot: InitialSnapshot = {
          title: titleV,
          subtitle: subtitleV,
          content: contentV,
          region_name: regionV,
          province_name: provinceV,
          published_at: publishedV,
          meta_title: metaTitleV,
          meta_description: metaDescriptionV,
          meta_keywords: metaKeywordsV,
          priority: priorityV,
          is_searchable: isSearchableV,
          author_id: authorIdV,
          video_url: videoUrlV,
          type: typeV,
          category_ids: selCats.map((c: { id: number; title: string }) => c.id),
          tag_ids: selTags.map((t: { id: number; name: string }) => t.id),
        }
        initialRef.current = snapshot
        setLoading(false)
        return () => { active = false }
      } catch {}
    }
    // If a request is already in-flight for this id, attach to it instead of starting a new one
    const inflight = articleDetailInflight.get(key)
    if (inflight) {
      setLoading(true)
      inflight.then((article) => {
        if (!active) return
        const titleV = article?.title ?? ''
        const subtitleV = article?.subtitle ?? ''
        const contentV = article?.content ?? ''
        const regionV =
          typeof article?.region_name === 'string' && article.region_name
            ? article.region_name
            : (article?.region && typeof article.region === 'object' && typeof article.region.name === 'string')
              ? article.region.name
              : typeof article?.region === 'string'
                ? article.region
                : ''
        const provinceV =
          typeof article?.province_name === 'string' && article.province_name
            ? article.province_name
            : (article?.province && typeof article.province === 'object' && typeof article.province.name === 'string')
              ? article.province.name
              : typeof article?.province === 'string'
                ? article.province
                : ''
        const publishedV = article?.published_at ? String(article.published_at).replace(' ', 'T').slice(0, 16) : ''
        const metaTitleV = article?.meta_title ?? ''
        const metaDescriptionV = article?.meta_description ?? ''
        const metaKeywordsV = article?.meta_keywords ?? ''
        const priorityV: number | '' = (typeof article?.priority === 'number') ? article.priority : ''
        const isSearchableV = article?.is_searchable === true || article?.is_searchable === 1 || article?.is_searchable === '1'
        const authorIdV: number | '' = article?.author?.id ?? article?.author_id ?? ''
        const authorNameV: string | null = article?.author?.name ?? article?.author_name ?? null
        const videoUrlV = article?.video_url ?? ''
        const typeV: ArticleType = 'Notizia'
        const catList = Array.isArray(article?.categories) ? article.categories : []
        const selCats = catList.map((c: any) => ({
          id: Number(c.id),
          title: c.title || c.name || `#${c.id}`,
          parent: (c?.parent && typeof c.parent === 'object')
            ? { id: Number(c.parent.id), title: String(c.parent.title || ''), slug: String(c.parent.slug || '') }
            : null,
        }))
        const tagList = Array.isArray(article?.tags) ? article.tags : []
        const selTags = tagList.map((t: any) => ({ id: Number(t.id), name: t.name || t.title || `#${t.id}` }))
        let coverPrev = article?.cover_preview || article?.cover_url || null
        const galleryList = Array.isArray(article?.gallery) ? article.gallery : []
        let exGallery: ExistingGalleryItem[] = galleryList
          .map((g: any) => ({ id: Number(g.id), url: g.preview_url || g.url || g.path || '', caption: g.caption || '' }))
          .filter((g: ExistingGalleryItem) => g.url)
        if (Array.isArray(galleryList) && galleryList.length > 0) {
          const first = galleryList[0]
          const firstUrl = first?.preview_url || first?.url || first?.path || null
          if (firstUrl) coverPrev = firstUrl
        }
        if (exGallery.length === 0 && coverPrev) {
          exGallery = [{ id: 0, url: coverPrev, caption: 'Cover' }]
        }

        setTitle(titleV)
        setSubtitle(subtitleV)
        setContent(contentV)
        setRegionName(regionV)
        setProvinceName(provinceV)
        setPublishedAt(publishedV)
        setMetaTitle(metaTitleV)
        setMetaDescription(metaDescriptionV)
        setMetaKeywords(metaKeywordsV)
        setPriority(priorityV)
        setIsSearchable(isSearchableV)
        setAuthorId(authorIdV)
        setAuthorName(authorNameV)
        setVideoUrl(videoUrlV)
        setType(typeV)
        setSelectedCategories(selCats)
        setSelectedTags(selTags)
        setCoverPreview(coverPrev)
        setExistingGallery(exGallery)
        setGalleryToRemove([])
        setGalleryFiles([])
        setGalleryPreviews([])
        setRemoveCover(false)

        const snapshot: InitialSnapshot = {
          title: titleV,
          subtitle: subtitleV,
          content: contentV,
          region_name: regionV,
          province_name: provinceV,
          published_at: publishedV,
          meta_title: metaTitleV,
          meta_description: metaDescriptionV,
          meta_keywords: metaKeywordsV,
          priority: priorityV,
          is_searchable: isSearchableV,
          author_id: authorIdV,
          video_url: videoUrlV,
          type: typeV,
          category_ids: selCats.map((c: { id: number; title: string }) => c.id),
          tag_ids: selTags.map((t: { id: number; name: string }) => t.id),
        }
        initialRef.current = snapshot
      }).catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
          toast.error('Articolo non trovato')
          router.push(APP_ROUTES.DASHBOARD.ARTICLES.LIST)
        } else {
          toast.error('Impossibile caricare i dettagli')
        }
      }).finally(() => { if (active) setLoading(false) })
      return () => { active = false }
    }
    ;(async () => {
      try {
        setLoading(true)
        let p = articleDetailInflight.get(key)
        if (!p) {
          p = (async () => {
            const res = await api.get<any>(API_ENDPOINTS.ARTICLES.DETAIL(key), undefined, { suppressGlobalToasts: true })
            const d = (res as any)?.data || res
            const art = d?.data || d
            try { articleDetailCache.set(key, art) } catch {}
            return art
          })()
          articleDetailInflight.set(key, p)
        }
        const article = await p

        const titleV = article?.title ?? ''
        const subtitleV = article?.subtitle ?? ''
        const contentV = article?.content ?? ''
        const regionV =
          typeof article?.region_name === 'string' && article.region_name
            ? article.region_name
            : (article?.region && typeof article.region === 'object' && typeof article.region.name === 'string')
              ? article.region.name
              : typeof article?.region === 'string'
                ? article.region
                : ''
        const provinceV =
          typeof article?.province_name === 'string' && article.province_name
            ? article.province_name
            : (article?.province && typeof article.province === 'object' && typeof article.province.name === 'string')
              ? article.province.name
              : typeof article?.province === 'string'
                ? article.province
                : ''
        const publishedV = article?.published_at ? String(article.published_at).replace(' ', 'T').slice(0, 16) : ''
        const metaTitleV = article?.meta_title ?? ''
        const metaDescriptionV = article?.meta_description ?? ''
        const metaKeywordsV = article?.meta_keywords ?? ''
        const priorityV: number | '' = (typeof article?.priority === 'number') ? article.priority : ''
        const isSearchableV = article?.is_searchable === true || article?.is_searchable === 1 || article?.is_searchable === '1'
        const authorIdV: number | '' = article?.author?.id ?? article?.author_id ?? ''
        const authorNameV: string | null = article?.author?.name ?? article?.author_name ?? null
        const videoUrlV = article?.video_url ?? ''
        const typeV: ArticleType = 'Notizia'
        const catList = Array.isArray(article?.categories) ? article.categories : []
        const selCats = catList.map((c: any) => ({
          id: Number(c.id),
          title: c.title || c.name || `#${c.id}`,
          parent: (c?.parent && typeof c.parent === 'object')
            ? { id: Number(c.parent.id), title: String(c.parent.title || ''), slug: String(c.parent.slug || '') }
            : null,
        }))
        const tagList = Array.isArray(article?.tags) ? article.tags : []
        const selTags = tagList.map((t: any) => ({ id: Number(t.id), name: t.name || t.title || `#${t.id}` }))
        let coverPrev = article?.cover_preview || article?.cover_url || null
        const galleryList = Array.isArray(article?.gallery) ? article.gallery : []
        let exGallery: ExistingGalleryItem[] = galleryList
          .map((g: any) => ({ id: Number(g.id), url: g.preview_url || g.url || g.path || '', caption: g.caption || '' }))
          .filter((g: ExistingGalleryItem) => g.url)
        if (Array.isArray(galleryList) && galleryList.length > 0) {
          const first = galleryList[0]
          const firstUrl = first?.preview_url || first?.url || first?.path || null
          if (firstUrl) coverPrev = firstUrl
        }
        if (exGallery.length === 0 && coverPrev) {
          exGallery = [{ id: 0, url: coverPrev, caption: 'Cover' }]
        }

        if (!active) return

        setTitle(titleV)
        setSubtitle(subtitleV)
        setContent(contentV)
        setRegionName(regionV)
        setProvinceName(provinceV)
        setPublishedAt(publishedV)
        setMetaTitle(metaTitleV)
        setMetaDescription(metaDescriptionV)
        setMetaKeywords(metaKeywordsV)
        setPriority(priorityV)
        setIsSearchable(isSearchableV)
        setAuthorId(authorIdV)
        setAuthorName(authorNameV)
        setVideoUrl(videoUrlV)
        setType(typeV)
        setSelectedCategories(selCats)
        setSelectedTags(selTags)
        setCoverPreview(coverPrev)
        setExistingGallery(exGallery)
        setGalleryToRemove([])
        setGalleryFiles([])
        setGalleryPreviews([])
        setRemoveCover(false)

        const snapshot: InitialSnapshot = {
          title: titleV,
          subtitle: subtitleV,
          content: contentV,
          region_name: regionV,
          province_name: provinceV,
          published_at: publishedV,
          meta_title: metaTitleV,
          meta_description: metaDescriptionV,
          meta_keywords: metaKeywordsV,
          priority: priorityV,
          is_searchable: isSearchableV,
          author_id: authorIdV,
          video_url: videoUrlV,
          type: typeV,
          category_ids: selCats.map((c: { id: number; title: string }) => c.id),
          tag_ids: selTags.map((t: { id: number; name: string }) => t.id),
        }
        initialRef.current = snapshot
        // Ensure inflight cleared for this key
        if (articleDetailInflight.get(key) === p) articleDetailInflight.delete(key)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          toast.error('Articolo non trovato')
          router.push(APP_ROUTES.DASHBOARD.ARTICLES.LIST)
        } else {
          toast.error('Impossibile caricare i dettagli')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [id, router])

  useEffect(() => {
    if (isJournalist && user?.id && !authorId) {
      setAuthorId(user.id)
      setAuthorName(user.profile?.full_name || user.email || `#${user.id}`)
    }
  }, [isJournalist, user, authorId])

  if (!id) {
    return null
  }

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }
  if (!canEdit) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per modificare gli articoli.</p>
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
      setRemoveCover(true)
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La cover supera 5MB')
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    setPendingImageURL(url)
    setPendingOriginalName(file.name || 'cover.jpg')
    setOpenCropper(true)
    setRemoveCover(false)
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

  function removeExistingGallery(idToRemove: number) {
    setGalleryToRemove((prev) => prev.includes(idToRemove) ? prev : [...prev, idToRemove])
    setExistingGallery((prev) => prev.filter((g) => g.id !== idToRemove))
  }

  function removeNewGalleryIndex(idx: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  // Drag and drop handlers for cover
  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        onCoverSelected(file)
      } else {
        toast.error('Seleziona solo file immagine')
      }
    }
  }

  // Drag and drop handlers for gallery
  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const imageFiles: File[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
          imageFiles.push(file)
        }
      }
      
      if (imageFiles.length > 0) {
        // Convert File[] to FileList-like object
        const fileList = {
          length: imageFiles.length,
          item: (index: number) => imageFiles[index],
          [Symbol.iterator]: function* () {
            for (let i = 0; i < imageFiles.length; i++) {
              yield imageFiles[i]
            }
          }
        } as FileList
        
        onGallerySelected(fileList)
      } else {
        toast.error('Seleziona solo file immagine')
      }
    }
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
    if (metaDescription && metaDescription.length > 160) {
      toast.error('Meta description troppo lunga (max 160)')
      return false
    }
    if (priority !== '' && (priority < 0 || priority > 100)) {
      toast.error('Priorità deve essere tra 0 e 100')
      return false
    }
    return true
  }

  function arraysEqual(a: number[], b: number[]) {
    if (a.length !== b.length) return false
    const sa = [...a].sort((x, y) => x - y)
    const sb = [...b].sort((x, y) => x - y)
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const initial = initialRef.current
    const formData = new FormData()
    formData.append('_method', 'PATCH')

    const changed: string[] = []
    const appendIfChanged = (key: string, newVal: any, oldVal: any) => {
      const n = newVal
      const o = oldVal
      const isDifferent = (typeof n === 'string' && typeof o === 'string') ? (n ?? '').trim() !== (o ?? '').trim() : n !== o
      if (isDifferent) {
        if (typeof n === 'boolean') formData.append(key, n ? '1' : '0')
        else formData.append(key, String(n))
        changed.push(key)
      }
    }
    const appendNullableStringIfChanged = (key: string, newVal: string, oldVal: string) => {
      const n = (newVal ?? '')
      const o = (oldVal ?? '')
      const isDifferent = n.trim() !== o.trim()
      if (isDifferent) {
        if (n.trim().length === 0) {
          formData.append(key, '')
        } else {
          formData.append(key, n)
        }
        changed.push(key)
      }
    }

    if (initial) {
      appendIfChanged('title', title, initial.title)
      appendNullableStringIfChanged('subtitle', subtitle, initial.subtitle)
      appendIfChanged('content', content, initial.content)
      appendNullableStringIfChanged('region_name', regionName, initial.region_name)
      appendNullableStringIfChanged('province_name', provinceName, initial.province_name)
      appendNullableStringIfChanged('published_at', publishedAt, initial.published_at)
      appendNullableStringIfChanged('meta_title', metaTitle, initial.meta_title)
      appendNullableStringIfChanged('meta_description', metaDescription, initial.meta_description)
      appendNullableStringIfChanged('meta_keywords', metaKeywords, initial.meta_keywords)
      appendNullableStringIfChanged('video_url', videoUrl, initial.video_url)
      if (priority !== '' || initial.priority !== '') {
        if (priority === '') {
          formData.append('priority', '')
          changed.push('priority')
        } else {
          appendIfChanged('priority', String(priority), initial.priority === '' ? '' : String(initial.priority))
        }
      }
      appendIfChanged('is_searchable', isSearchable, initial.is_searchable)
      if (authorId !== '' || initial.author_id !== '') appendIfChanged('author_id', authorId === '' ? '' : String(authorId), initial.author_id === '' ? '' : String(initial.author_id))
      // Arrays: invia solo differenze (aggiunte e rimozioni)
      const addedCats = categoryIds.filter((idNum) => !initial.category_ids.includes(idNum))
      const removedCats = initial.category_ids.filter((idNum) => !categoryIds.includes(idNum))
      if (addedCats.length > 0) {
        addedCats.forEach((idNum) => formData.append('category_ids[]', String(idNum)))
        changed.push('category_ids[]')
      }
      if (removedCats.length > 0) {
        removedCats.forEach((idNum) => formData.append('category_ids_to_remove[]', String(idNum)))
        changed.push('category_ids_to_remove[]')
      }

      const addedTags = tagIds.filter((idNum) => !initial.tag_ids.includes(idNum))
      const removedTags = initial.tag_ids.filter((idNum) => !tagIds.includes(idNum))
      if (addedTags.length > 0) {
        addedTags.forEach((idNum) => formData.append('tag_ids[]', String(idNum)))
        changed.push('tag_ids[]')
      }
      if (removedTags.length > 0) {
        removedTags.forEach((idNum) => formData.append('tag_ids_to_remove[]', String(idNum)))
        changed.push('tag_ids_to_remove[]')
      }
    } else {
      // Safety fallback: send minimal required
      formData.append('title', title)
      formData.append('content', content)
    }

    // Cover handling
    if (coverFile) {
      formData.append('cover', coverFile)
      changed.push('cover')
    } else if (removeCover) {
      // Il backend richiede true/false booleano
      formData.append('remove_cover', '1')
      changed.push('remove_cover')
    }

    // Gallery new files
    if (galleryFiles.length > 0) {
      galleryFiles.forEach((f) => formData.append('gallery[]', f))
      changed.push('gallery[]')
    }

    // Gallery removals (existing ids) — append same key multiple times
    if (galleryToRemove.length > 0) {
      galleryToRemove.forEach((gid) => formData.append('gallery_to_remove[]', String(gid)))
      changed.push('gallery_to_remove[]')
    }

    if (changed.length === 0) {
      toast.message('Nessuna modifica da salvare')
      return
    }

    setSubmitting(true)
    try {
      await api.post(API_ENDPOINTS.ARTICLES.UPDATE(String(id)), formData as any)
      toast.success('Articolo aggiornato con successo')
      // Rimani sulla stessa pagina: ricarica i dettagli per aggiornare lo snapshot
      try {
        const res = await api.get<any>(API_ENDPOINTS.ARTICLES.DETAIL(String(id)))
        const d = (res as any)?.data || res
        const article = d?.data || d
        const titleV = article?.title ?? ''
        const subtitleV = article?.subtitle ?? ''
        const contentV = article?.content ?? ''
        const regionV =
          typeof article?.region_name === 'string' && article.region_name
            ? article.region_name
            : (article?.region && typeof article.region === 'object' && typeof article.region.name === 'string')
              ? article.region.name
              : typeof article?.region === 'string'
                ? article.region
                : ''
        const provinceV =
          typeof article?.province_name === 'string' && article.province_name
            ? article.province_name
            : (article?.province && typeof article.province === 'object' && typeof article.province.name === 'string')
              ? article.province.name
              : typeof article?.province === 'string'
                ? article.province
                : ''
        const publishedV = article?.published_at ? String(article.published_at).replace(' ', 'T').slice(0, 16) : ''
        const metaTitleV = article?.meta_title ?? ''
        const metaDescriptionV = article?.meta_description ?? ''
        const metaKeywordsV = article?.meta_keywords ?? ''
        const priorityV: number | '' = (typeof article?.priority === 'number') ? article.priority : ''
        const isSearchableV = article?.is_searchable === true || article?.is_searchable === 1 || article?.is_searchable === '1'
        const authorIdV: number | '' = article?.author?.id ?? article?.author_id ?? ''
        const authorNameV: string | null = article?.author?.name ?? article?.author_name ?? null
        const videoUrlV = article?.video_url ?? ''
        const typeV: ArticleType = 'Notizia'
        const catList = Array.isArray(article?.categories) ? article.categories : []
        const selCats = catList.map((c: any) => ({ id: Number(c.id), title: c.title || c.name || `#${c.id}` }))
        const tagList = Array.isArray(article?.tags) ? article.tags : []
        const selTags = tagList.map((t: any) => ({ id: Number(t.id), name: t.name || t.title || `#${t.id}` }))
        let coverPrev = article?.cover_preview || article?.cover_url || null
        const galleryList = Array.isArray(article?.gallery) ? article.gallery : []
        let exGallery: ExistingGalleryItem[] = galleryList
          .map((g: any) => ({ id: Number(g.id), url: g.preview_url || g.url || g.path || '', caption: g.caption || '' }))
          .filter((g: ExistingGalleryItem) => g.url)
        if (Array.isArray(galleryList) && galleryList.length > 0) {
          const first = galleryList[0]
          const firstUrl = first?.preview_url || first?.url || first?.path || null
          if (firstUrl) coverPrev = firstUrl
        }
        if (exGallery.length === 0 && coverPrev) {
          exGallery = [{ id: 0, url: coverPrev, caption: 'Cover' }]
        }

        setTitle(titleV)
        setSubtitle(subtitleV)
        setContent(contentV)
        setRegionName(regionV)
        setProvinceName(provinceV)
        setPublishedAt(publishedV)
        setMetaTitle(metaTitleV)
        setMetaDescription(metaDescriptionV)
        setMetaKeywords(metaKeywordsV)
        setPriority(priorityV)
        setIsSearchable(isSearchableV)
        setAuthorId(authorIdV)
        setAuthorName(authorNameV)
        setVideoUrl(videoUrlV)
        setType(typeV)
        setSelectedCategories(selCats)
        setSelectedTags(selTags)
        setCoverPreview(coverPrev)
        setExistingGallery(exGallery)
        setGalleryToRemove([])
        setGalleryFiles([])
        setGalleryPreviews([])
        setRemoveCover(false)

        const snapshot: InitialSnapshot = {
          title: titleV,
          subtitle: subtitleV,
          content: contentV,
          region_name: regionV,
          province_name: provinceV,
          published_at: publishedV,
          meta_title: metaTitleV,
          meta_description: metaDescriptionV,
          meta_keywords: metaKeywordsV,
          priority: priorityV,
          is_searchable: isSearchableV,
          author_id: authorIdV,
          video_url: videoUrlV,
          type: typeV,
          category_ids: selCats.map((c: { id: number; title: string }) => c.id),
          tag_ids: selTags.map((t: { id: number; name: string }) => t.id),
        }
        initialRef.current = snapshot
        try { articleDetailCache.set(String(id), article) } catch {}
      } catch {}
    } catch (error) {
      // Errori gestiti globalmente
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title={`Modifica articolo #${id}`}
        subtitle="Aggiorna contenuti e media dell'articolo"
        icon={(
          <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6M9 16h6" />
          </svg>
        )}
      />

      {loading ? (
        <div className="text-sm text-gray-500">Caricamento dati...</div>
      ) : (
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
                {((coverFile) || (coverPreview && !isDefaultCover(coverPreview))) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => { setCoverFile(null); setCoverPreview(null); setRemoveCover(true); if (coverInputRef.current) coverInputRef.current.value = '' }}
                  >
                    Rimuovi cover
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cover</Label>
                  <div 
                    ref={coverDropRef}
                    className="h-40 w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                    onDragOver={handleCoverDragOver}
                    onDrop={handleCoverDrop}
                  >
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
                  <Label>Galleria (esistenti)</Label>
                  {existingGallery.length === 0 ? (
                    <div className="text-xs text-gray-500">Nessuna immagine presente</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {existingGallery.map((g) => (
                        <div key={g.id} className="relative h-24 w-full rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <img src={g.url} alt={`g-${g.id}`} className="h-full w-full object-cover" />
                          <button type="button" className="absolute top-1 right-1 bg-white/90 dark:bg-gray-900/80 rounded-full p-1" onClick={() => removeExistingGallery(g.id)} aria-label="Rimuovi">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          <div className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-[10px] p-1 truncate">{g.caption || 'Immagine'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Galleria (nuove)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {galleryPreviews.map((src, idx) => (
                      <div key={`${src}-${idx}`} className="relative h-24 w-full rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <img src={src} alt={`g-${idx}`} className="h-full w-full object-cover" />
                        <button type="button" className="absolute top-1 right-1 bg-white/90 dark:bg-gray-900/80 rounded-full p-1" onClick={() => removeNewGalleryIndex(idx)} aria-label="Rimuovi">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-[10px] p-1 truncate">Anteprima</div>
                      </div>
                    ))}
                  </div>
                  <div 
                    ref={galleryDropRef}
                    className="min-h-[100px] w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    onDragOver={handleGalleryDragOver}
                    onDrop={handleGalleryDrop}
                  >
                    <div className="text-xs text-gray-500">Trascina qui le immagini o usa il selettore sotto</div>
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
                <h3 className="text-base font-semibold">Categorie</h3>
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
                    autoRunOnMount
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
                  <Label>Data pubblicazione</Label>
                  <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                </div>
                {showPriorityField && (
                  <div className="space-y-2">
                    <Label>Priorità</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder="0-100"
                    />
                    <p className="text-xs text-gray-500">Priorità per l'ordinamento (0-100)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const ok = window.confirm(`Confermi l'eliminazione dell'articolo #${id}?`)
                      if (!ok) return
                      try {
                        await api.delete(API_ENDPOINTS.ARTICLES.DELETE(String(id)))
                        toast.success('Articolo eliminato')
                        router.push(APP_ROUTES.DASHBOARD.ARTICLES.LIST)
                      } catch (error) {
                        // Errori gestiti globalmente
                      }
                    }}
                  >
                    Elimina
                  </Button>
                ) : <span />}
                <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Salva modifiche'}</Button>
              </div>
            </div>
          </aside>
        </form>
      )}

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
          if (!coverFile && !coverPreview) setRemoveCover(true)
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
          setRemoveCover(false)
        }}
      />
    </div>
  )
}


