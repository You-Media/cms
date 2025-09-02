'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import ImageCropperModal from '@/components/forms/image-cropper-modal'
import { toast } from 'sonner'
import { fetchUserDetail, updateUser, invalidateUserDetailCache } from '@/hooks/use-users'

type EditUserPageProps = { params: { id: string } }

export default function EditUserPage({ params }: EditUserPageProps) {
  const userId = params.id
  const { hasPermission, hasAnyRole, isSuperAdmin } = useAuth()
  
  // Mappatura nomi ruoli in italiano
  const roleLabelIt = (role: string): string => {
    switch (role) {
      case 'EditorInChief':
        return 'Caporedattore'
      case 'Publisher':
        return 'Editore'
      case 'AdvertisingManager':
        return 'Manager Pubblicità'
      case 'Journalist':
        return 'Giornalista'
      case 'Consumer':
        return 'Lettore'
      default:
        return role
    }
  }
  
  const canEdit = hasPermission('manage_users') || hasPermission('manage_publishers') || hasPermission('manage_editors_in_chief') || hasPermission('manage_advertising_managers') || hasPermission('manage_journalists')
  const allowedRoleOptions: string[] = (() => {
    if (isSuperAdmin) return ['EditorInChief', 'Publisher', 'AdvertisingManager', 'Journalist', 'Consumer']
    const set = new Set<string>()
    if (hasAnyRole(['Admin'])) { ;['Publisher', 'EditorInChief', 'AdvertisingManager', 'Consumer'].forEach((r) => set.add(r)) }
    if (hasAnyRole(['Publisher'])) { ;['EditorInChief', 'AdvertisingManager'].forEach((r) => set.add(r)) }
    if (hasAnyRole(['EditorInChief'])) { set.add('Journalist') }
    return Array.from(set)
  })()

  // React hooks must be called before any conditional returns
  const [submitting, setSubmitting] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConf, setPasswordConf] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [openCropper, setOpenCropper] = useState(false)
  const [pendingImageURL, setPendingImageURL] = useState<string | null>(null)
  const [pendingOriginalName, setPendingOriginalName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string[] }>({})
  const [removePhoto, setRemovePhoto] = useState(false)
  const isDefaultPhoto = (photoPreview && photoPreview.includes('images/default-propic.png')) || false
  // Snapshot per confronto
  const [origFirstName, setOrigFirstName] = useState('')
  const [origLastName, setOrigLastName] = useState('')
  const [origEmail, setOrigEmail] = useState('')
  const [origRoles, setOrigRoles] = useState<string[]>([])

  // Evita doppio fetch in StrictMode
  const hasLoadedRef = useRef(false)
  // Errori aggregati per ruoli (roles e roles.*)
  const roleErrorMessages: string[] = [
    ...(fieldErrors.roles || []),
    ...Object.entries(fieldErrors)
      .filter(([k]) => k.startsWith('roles.'))
      .flatMap(([, msgs]) => msgs),
  ]
  useEffect(() => {
    let aborted = false
    async function load() {
      if (hasLoadedRef.current) return
      try {
        const res = await fetchUserDetail(userId)
        const data = (res as any).data || res
        if (aborted || !data) return
        const fn = data?.profile?.first_name || ''
        const ln = data?.profile?.last_name || ''
        const em = data?.email || ''
        const rs = Array.isArray(data?.roles) ? data.roles : []
        setFirstName(fn)
        setLastName(ln)
        setEmail(em)
        setRoles(rs)
        setOrigFirstName(fn)
        setOrigLastName(ln)
        setOrigEmail(em)
        setOrigRoles(rs)
        const avatar = data?.profile?.profile_photo || ''
        if (avatar) setPhotoPreview(avatar)
        hasLoadedRef.current = true
      } catch {}
    }
    void load()
    return () => { aborted = true }
  }, [userId])

  if (!canEdit) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per modificare utenti.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Modifica utente"
        subtitle={`Aggiorna i dati dell'utente #${userId}`}
        icon={(
          <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 21v-2a4 4 0 00-3-3.87" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        )}
      />

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setFieldErrors({})
          setSubmitting(true)
          try {
            const payload: { [k: string]: any } = {}
            const trim = (s: string) => s.trim()
            const firstTrim = trim(firstName)
            const lastTrim = trim(lastName)
            const emailTrim = trim(email)

            // Client-side required guards only when the field is being changed
            const clientErrors: Record<string, string[]> = {}
            if (firstTrim !== trim(origFirstName) && firstTrim === '') clientErrors.first_name = ['Il nome è obbligatorio']
            if (lastTrim !== trim(origLastName) && lastTrim === '') clientErrors.last_name = ['Il cognome è obbligatorio']
            if (emailTrim !== trim(origEmail) && emailTrim === '') clientErrors.email = ["L'indirizzo email è obbligatorio"]

            const rolesChanged = (origRoles.length !== roles.length) || origRoles.some((r) => !roles.includes(r))
            if (rolesChanged && roles.length === 0) clientErrors.roles = ['Il ruolo è obbligatorio']

            if (Object.keys(clientErrors).length > 0) {
              setFieldErrors(clientErrors)
              setSubmitting(false)
              return
            }

            if (firstTrim !== trim(origFirstName)) payload.first_name = firstTrim
            if (lastTrim !== trim(origLastName)) payload.last_name = lastTrim
            if (emailTrim !== trim(origEmail)) payload.email = emailTrim
            if (password) {
              payload.password = password
              if (passwordConf) payload.password_confirmation = passwordConf
            }
            if (rolesChanged) payload.roles = roles
            if (photo) payload.profile_photo = photo
            if (!photo && removePhoto) payload.remove_profile_photo = true
            await updateUser(userId, payload)
            toast.success('Utente aggiornato')
            
            // Invalidate cache and reset hasLoadedRef to force fresh data on next visit
            invalidateUserDetailCache(userId)
            hasLoadedRef.current = false
            
            // Reload data immediately to show updated information
            try {
              const res = await fetchUserDetail(userId)
              const data = (res as any).data || res
              if (data) {
                const fn = data?.profile?.first_name || ''
                const ln = data?.profile?.last_name || ''
                const em = data?.email || ''
                const rs = Array.isArray(data?.roles) ? data.roles : []
                setFirstName(fn)
                setLastName(ln)
                setEmail(em)
                setRoles(rs)
                setOrigFirstName(fn)
                setOrigLastName(ln)
                setOrigEmail(em)
                setOrigRoles(rs)
                const avatar = data?.profile?.profile_photo || ''
                if (avatar) setPhotoPreview(avatar)
                hasLoadedRef.current = true
              }
            } catch (error) {
              console.error('Failed to reload user data:', error)
            }
          } catch (e) {
            if (e instanceof ApiError && e.status === 422 && (e as any).errors) {
              setFieldErrors((e as any).errors as Record<string, string[]>)
            }
          } finally {
            setSubmitting(false)
          }
        }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
      >
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Nome</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" />
                {fieldErrors.first_name?.map((m, i) => (<div key={`fn-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
              </div>
              <div>
                <Label className="text-sm">Cognome</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" />
                {fieldErrors.last_name?.map((m, i) => (<div key={`ln-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.it" />
                {fieldErrors.email?.map((m, i) => (<div key={`em-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
              </div>
              <div>
                <Label className="text-sm">Ruoli</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allowedRoleOptions.map((r) => {
                    const active = roles.includes(r)
                    return (
                      <button type="button" key={r} onClick={() => setRoles(active ? roles.filter((x) => x !== r) : [...roles, r])} className={`px-3 py-1.5 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{roleLabelIt(r)}</button>
                    )
                  })}
                </div>
                {roleErrorMessages.map((m, i) => (<div key={`roles-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
              </div>
            </div>
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Password (opzionale)</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lascia vuoto per non modificare" />
                  {fieldErrors.password?.map((m, i) => (<div key={`pw-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
                </div>
                <div>
                  <Label className="text-sm">Conferma password</Label>
                  <Input type="password" value={passwordConf} onChange={(e) => setPasswordConf(e.target.value)} placeholder="Ripeti password" />
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm">Foto profilo</Label>
              <div className="relative">
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
                  <button
                    type="button"
                    title={photoPreview ? 'Ingrandisci anteprima' : ''}
                    className="h-40 md:h-52 w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                    onClick={() => {
                      if (!photoPreview) return
                      const w = window.open('', '_blank')
                      if (w) {
                        w.document.write(`<img src=\"${photoPreview}\" style=\"max-width:100%;height:auto;\" />`)
                      }
                    }}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="anteprima" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Trascina o seleziona un’immagine</div>
                    )}
                  </button>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (!file) return
                        const url = URL.createObjectURL(file)
                        setPendingImageURL(url)
                        setPendingOriginalName(file.name || null)
                        setOpenCropper(true)
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <Button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Seleziona immagine
                      </Button>
                      {photoPreview && !isDefaultPhoto && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="inline-flex items-center gap-2"
                          onClick={() => { setRemovePhoto(true); setPhoto(null); setPhotoPreview(null) }}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          Rimuovi foto
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Formato consigliato quadrato (es. 512x512)</p>
                    {fieldErrors.profile_photo?.map((m, i) => (<div key={`pp-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
                  </div>
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
              <div className="p-6 space-y-3 text-sm">
                <div><span className="text-gray-500 text-xs">Utente</span><div className="font-medium">#{userId}</div></div>
                <div><span className="text-gray-500 text-xs">Nome</span><div className="font-medium">{firstName || '-'}</div></div>
                <div><span className="text-gray-500 text-xs">Cognome</span><div className="font-medium">{lastName || '-'}</div></div>
                <div><span className="text-gray-500 text-xs">Email</span><div className="font-medium break-all">{email || '-'}</div></div>
                <div><span className="text-gray-500 text-xs">Ruoli</span><div className="font-medium">{roles.length ? roles.map(r => roleLabelIt(r)).join(', ') : '-'}</div></div>
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">Foto profilo</div>
                  <div className="flex items-center">
                    <div className="h-16 w-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                      {photoPreview ? (
                        <img src={photoPreview} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">N/A</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Salva modifiche'}</Button>
              </div>
            </div>
          </div>
        </aside>
      </form>
      <ImageCropperModal
        open={openCropper}
        onClose={() => {
          setOpenCropper(false)
          if (pendingImageURL) URL.revokeObjectURL(pendingImageURL)
          setPendingImageURL(null)
          setPendingOriginalName(null)
        }}
        imageURL={pendingImageURL || ''}
        requiredWidth={512}
        requiredHeight={512}
        onCropped={(blob, previewURL) => {
          const baseName = pendingOriginalName || 'profile_photo'
          const filename = `cropped_${baseName}`
          setPhoto(new File([blob], filename, { type: blob.type }))
          setPhotoPreview(previewURL)
          setOpenCropper(false)
          setPendingOriginalName(null)
          setPendingImageURL(null)
        }}
      />
    </div>
  )
}


