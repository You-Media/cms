'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { FiltersCard } from '@/components/table/FiltersCard'
import { ResultsHeader } from '@/components/table/ResultsHeader'
import { PaginationBar } from '@/components/table/PaginationBar'
import { DataTable, type DataTableColumn } from '@/components/table/DataTable'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import type { Banner, BannerModel, BannerPosition, BannerStatus } from '@/types/banners'
import { useBanners } from '@/hooks/use-banners'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export default function BannersPage() {
  const { selectedSite, hasAnyRole, hasPermission } = useAuth()

  const allowedRoles = ['PUBLISHER', 'EDITOR_IN_CHIEF', 'ADVERTISING_MANAGER']
  const canView = selectedSite === 'editoria' && hasAnyRole(allowedRoles) && hasPermission('view_banners')

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Accesso negato</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai i permessi necessari per accedere a questa risorsa.</p>
      </div>
    )
  }

  const { banners, loading, total, currentPage, totalPages, perPage, setPerPage, filterBanners, deleteBanner, updateBannerStatus } = useBanners()

  const [model, setModel] = useState<BannerModel | ''>('')
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<BannerPosition | ''>('')
  const [status, setStatus] = useState<BannerStatus | ''>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'order'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState<number>(1)
  const lastKeyRef = useRef<string>('')

  const canDelete = hasPermission('delete_banner')
  const canPublish = hasPermission('publish_banner')
  const canUnpublish = hasPermission('unpublish_banner')
  const canEdit = hasPermission('edit_banner')

  useEffect(() => {
    const key = `${page}|${perPage}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    filterBanners({ page, per_page: perPage, sort_by: sortBy, sort_direction: sortDirection })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage])

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    filterBanners({
      page: 1,
      per_page: perPage,
      model: model || undefined,
      search: search || undefined,
      position: position || undefined,
      status: status || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
    })
  }

  const handleDelete = async (banner: Banner) => {
    if (!canDelete) return
    const ok = window.confirm(`Confermi l'eliminazione del banner #${banner.id}?`)
    if (!ok) return
    try {
      await deleteBanner(banner.id)
      toast.success('Banner eliminato')
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Non sei autorizzato a fare questa operazione')
      } else {
        toast.error('Eliminazione non riuscita')
      }
    }
  }

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])

  const POSITION_LABEL: Record<BannerPosition, string> = {
    center: 'Centro',
    right: 'Destra',
    left: 'Sinistra',
  }

  const STATUS_LABEL: Record<BannerStatus, string> = {
    Draft: 'Bozza',
    Active: 'Attivo',
    Inactive: 'Inattivo',
  }

  const getStatusDotClass = (status: BannerStatus): string => {
    switch (status) {
      case 'Active':
        return 'bg-green-500'
      case 'Inactive':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const MODEL_LABEL: Record<BannerModel, string> = {
    Home: 'Home',
    Article: 'Articolo',
    Category: 'Categoria',
  }

  const formatDate = (isoString: string): string => {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  const truncate = (text: string | null | undefined, max: number): string => {
    const t = text || ''
    if (t.length <= max) return t
    return `${t.slice(0, max)}…`
  }

  function PlacementIcon({ position }: { position: BannerPosition }) {
    const isLeft = position === 'left'
    const isCenter = position === 'center'
    const isRight = position === 'right'
    const base = 'w-2.5 h-2.5 rounded-sm'
    return (
      <div className="flex items-center gap-1" aria-label={`Posizione: ${POSITION_LABEL[position]}`} title={`Posizione: ${POSITION_LABEL[position]}`}>
        <span className={`${base} ${isLeft ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <span className={`${base} ${isCenter ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <span className={`${base} ${isRight ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
      </div>
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

  function PreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className="relative max-w-5xl w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <button
            className="absolute top-2 right-2 p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="w-full h-[70vh] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <img src={src} alt="banner" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      </div>
    )
  }

  function RowActions({ banner }: { banner: Banner }) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', onDocClick)
      return () => document.removeEventListener('mousedown', onDocClick)
    }, [])

    return (
      <div className="relative" ref={menuRef}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 w-9 p-0 flex items-center justify-center"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Azioni banner #${banner.id}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </Button>
        {open && (
          <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 py-1">
            {(canPublish || canUnpublish) && (
              <>
                {canPublish && (
                  <button
                    type="button"
                    disabled={!canPublish || banner.status === 'Active'}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={async () => {
                      setOpen(false)
                      try {
                        await updateBannerStatus(banner.id, 'Active')
                        toast.success('Banner pubblicato')
                      } catch (error) {
                        if (error instanceof ApiError && error.status === 403) {
                          toast.error('Non sei autorizzato a fare questa operazione')
                        } else {
                          toast.error('Aggiornamento stato non riuscito')
                        }
                      }
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Pubblica
                  </button>
                )}
                {canUnpublish && (
                  <>
                    <button
                      type="button"
                      disabled={!canUnpublish || banner.status === 'Inactive'}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        setOpen(false)
                        try {
                          await updateBannerStatus(banner.id, 'Inactive')
                          toast.success('Banner reso inattivo')
                        } catch (error) {
                          if (error instanceof ApiError && error.status === 403) {
                            toast.error('Non sei autorizzato a fare questa operazione')
                          } else {
                            toast.error('Aggiornamento stato non riuscito')
                          }
                        }
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Rendi inattivo
                    </button>
                    <button
                      type="button"
                      disabled={!canUnpublish || banner.status === 'Draft'}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        setOpen(false)
                        try {
                          await updateBannerStatus(banner.id, 'Draft')
                          toast.success('Banner in bozza')
                        } catch (error) {
                          if (error instanceof ApiError && error.status === 403) {
                            toast.error('Non sei autorizzato a fare questa operazione')
                          } else {
                            toast.error('Aggiornamento stato non riuscito')
                          }
                        }
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8" />
                      </svg>
                      Bozza
                    </button>
                  </>
                )}
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              </>
            )}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                window.open(banner.banner_preview, '_blank')
                setOpen(false)
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7v7m0 0L10 21l-7-7L14 3z" />
              </svg>
              Vedi su Editoria
            </button>
            {canEdit && (
              <Link
                href={APP_ROUTES.DASHBOARD.BANNERS.EDIT(banner.id)}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() => { setOpen(false) }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifica
              </Link>
            )}
            <button
              type="button"
              disabled={!canDelete}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50"
              onClick={() => {
                setOpen(false)
                handleDelete(banner)
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Cancella banner
            </button>
          </div>
        )}
      </div>
    )
  }

  const columns: Array<DataTableColumn<Banner>> = [
    {
      key: 'id',
      header: 'ID',
      cell: (b) => (
        <div className="flex items-center gap-2">
          <span
            title={STATUS_LABEL[b.status]}
            className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusDotClass(b.status)}`}
          />
          <span className="text-xs font-mono">#{b.id}</span>
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'banner_url',
      header: 'Anteprima',
      cell: (b) => {
        const [open, setOpen] = useState(false)
        return (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-block focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
              title="Ingrandisci anteprima"
            >
              <div className="h-16 w-64 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <img src={b.banner_url} alt={`banner-${b.id}`} className="max-h-full max-w-full object-contain" />
              </div>
            </button>
            {open && <PreviewModal src={b.banner_url} onClose={() => setOpen(false)} />}
          </>
        )
      },
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'model',
      header: 'Modello',
      cell: (b) => (
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center cursor-help">
                <ModelIcon model={b.model} />
              </div>
            </TooltipTrigger>
            <TooltipContent>{MODEL_LABEL[b.model]}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'model_title',
      header: 'Titolo',
      cell: (b) => (
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[220px] sm:max-w-[280px] md:max-w-[360px] lg:max-w-[420px] xl:max-w-[520px] leading-snug cursor-help">
                {truncate(b.model_title, 30) || '-'}
              </div>
            </TooltipTrigger>
            <TooltipContent>{b.model_title || '-'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      tdClassName: 'px-6 py-4',
    },
    {
      key: 'placement',
      header: 'Posizionamento',
      cell: (b) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">#{b.order}</span>
          <PlacementIcon position={b.position} />
        </div>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'created_at',
      header: 'Data creazione',
      cell: (b) => (
        <time dateTime={b.created_at} className="text-sm text-gray-700 dark:text-gray-300">
          {formatDate(b.created_at)}
        </time>
      ),
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
    {
      key: 'author',
      header: 'Autore',
      cell: (b) => (
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 cursor-help">
                {b.createdBy?.avatar && (
                  <img
                    src={b.createdBy.avatar}
                    alt={b.createdBy.name}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">{b.createdBy?.name || '-'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-center gap-3">
                {b.createdBy?.avatar && (
                  <img
                    src={b.createdBy.avatar}
                    alt={b.createdBy.name}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                )}
                <div>
                  <div className="font-medium">{b.createdBy?.name || '-'}</div>
                  {b.createdBy?.email && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">{b.createdBy.email}</div>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      tdClassName: 'px-6 py-4',
    },
    {
      key: 'actions',
      header: 'Azioni',
      cell: (b) => <RowActions banner={b} />,
      tdClassName: 'px-6 py-4 whitespace-nowrap',
    },
  ]

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Banner"
        subtitle="Gestisci i banner filtrando per modello, titolo e posizione"
        icon={(
          <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h8" />
          </svg>
        )}
      />

      <FiltersCard onSubmit={onSearchSubmit} isLoading={loading} gridCols={3} submitLabel="Cerca" submitFullWidth={true} submitUseEmptyLabel={true}>
        {/* Riga 1: solo ricerca (full-width) */}
        <div className="space-y-2 md:col-span-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ricerca</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titolo articolo o categoria" />
        </div>

        {/* Riga 2: Modello, Posizione, Stato */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Modello</Label>
          <Select value={model || ''} onValueChange={(v) => setModel(v === '__ALL__' ? '' : (v as BannerModel))}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Tutti</SelectItem>
              <SelectItem value="Home">
                <div className="flex items-center gap-2"><ModelIcon model={'Home'} /> Home</div>
              </SelectItem>
              <SelectItem value="Article">
                <div className="flex items-center gap-2"><ModelIcon model={'Article'} /> Articolo</div>
              </SelectItem>
              <SelectItem value="Category">
                <div className="flex items-center gap-2"><ModelIcon model={'Category'} /> Categoria</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Posizione</Label>
          <Select value={position || ''} onValueChange={(v) => setPosition(v === '__ALL__' ? '' : (v as BannerPosition))}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Tutte</SelectItem>
              <SelectItem value="left"> 
                <div className="flex items-center gap-2">
                  <PlacementIcon position={'left' as BannerPosition} />
                  Sinistra
                </div>
              </SelectItem>
              <SelectItem value="center">
                <div className="flex items-center gap-2">
                  <PlacementIcon position={'center' as BannerPosition} />
                  Centro
                </div>
              </SelectItem>
              <SelectItem value="right">
                <div className="flex items-center gap-2">
                  <PlacementIcon position={'right' as BannerPosition} />
                  Destra
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stato</Label>
          <Select value={status || ''} onValueChange={(v) => setStatus(v === '__ALL__' ? '' : (v as BannerStatus))}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__" >Tutti</SelectItem>
              <SelectItem value="Draft">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
                  Bozza
                </div>
              </SelectItem>
              <SelectItem value="Active">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                  Attivo
                </div>
              </SelectItem>
              <SelectItem value="Inactive">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                  Inattivo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Riga 3: Ordina per, Direzione (il pulsante submit del FiltersCard andrà nello slot 3) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordina per</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'created_at' | 'order')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Data creazione</SelectItem>
              <SelectItem value="order">Ordine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Direzione</Label>
          <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as 'asc' | 'desc')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Decrescente</SelectItem>
              <SelectItem value="asc">Crescente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FiltersCard>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ResultsHeader
          title="Risultati"
          subtitle={`${total} risultati`}
          actions={(
            hasPermission('create_banner') ? (
              <Link href={APP_ROUTES.DASHBOARD.BANNERS.NEW} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuovo banner
              </Link>
            ) : null
          )}
          rightAside={(
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-end gap-1 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" /> Bozza
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Attivo
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Inattivo
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                  </div>
                  Sinistra
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                  </div>
                  Centro
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  </div>
                  Destra
                </div>
              </div>
            </div>
          )}
        />
        <DataTable<Banner>
          data={Array.isArray(banners) ? banners : []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          loadingLabel="Caricamento banner..."
          emptyTitle="Nessun banner trovato"
          emptySubtitle="Prova a regolare i filtri"
        />
      </div>

      <PaginationBar
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        perPage={perPage}
        setPerPage={setPerPage}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={() => setPage(Math.max(1, page - 1))}
        onNext={() => setPage(Math.min(totalPages, page + 1))}
      />
    </div>
  )
}


