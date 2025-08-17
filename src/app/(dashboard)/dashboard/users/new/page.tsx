'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { PageHeaderCard } from '@/components/layout/PageHeaderCard'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createUser } from '@/hooks/use-users'
import { ApiError } from '@/lib/api'
import ImageCropperModal from '@/components/forms/image-cropper-modal'
import { toast } from 'sonner'
import { z } from 'zod'

export default function NewUserPage() {
  const { hasPermission, hasAnyRole, isSuperAdmin } = useAuth()
  // Stessa logica di visibilità ruoli della tabella
  const allowedRoleOptions: string[] = (() => {
    if (isSuperAdmin) return ['EditorInChief', 'Publisher', 'AdvertisingManager', 'Journalist', 'Consumer']
    const set = new Set<string>()
    if (hasAnyRole(['Admin'])) {
      ;['Publisher', 'EditorInChief', 'AdvertisingManager', 'Consumer'].forEach((r) => set.add(r))
    }
    if (hasAnyRole(['Publisher'])) {
      ;['EditorInChief', 'AdvertisingManager'].forEach((r) => set.add(r))
    }
    if (hasAnyRole(['EditorInChief'])) {
      set.add('Journalist')
    }
    return Array.from(set)
  })()
  const canCreate = hasPermission('manage_users') || hasPermission('manage_publishers') || hasPermission('manage_editors_in_chief') || hasPermission('manage_advertising_managers') || hasPermission('manage_journalists')

  if (!canCreate) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">403 - Operazione non consentita</h1>
        <p className="text-sm text-gray-500 mt-2">Non hai il permesso per creare nuovi utenti.</p>
      </div>
    )
  }

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
  const passwordSchema = z
    .string()
    .min(8, 'La password deve contenere almeno 8 caratteri')
    .max(255)
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'La password deve contenere almeno un carattere speciale')

  return (
    <div className="p-6 space-y-8">
      <PageHeaderCard
        title="Nuovo utente"
        subtitle="Compila i dati e seleziona i ruoli. A destra trovi il riepilogo."
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
          if (!firstName.trim() || !lastName.trim()) { toast.error('Inserisci nome e cognome'); return }
          if (!email.trim()) { toast.error('Inserisci una email valida'); return }
          const pwdCheck = passwordSchema.safeParse(password)
          if (!pwdCheck.success) {
            setFieldErrors((prev) => ({ ...prev, password: pwdCheck.error.issues.map((i) => i.message) }))
            return
          }
          if (password !== passwordConf) {
            setFieldErrors((prev) => ({ ...prev, password: ['Le password non coincidono'] }))
            return
          }
          if (roles.length === 0) { setFieldErrors((prev) => ({ ...prev, roles: ['Il ruolo è obbligatorio'] })); return }
          setSubmitting(true)
          try {
            await createUser({ first_name: firstName, last_name: lastName, email, password, password_confirmation: passwordConf, roles, profile_photo: photo })
            toast.success('Utente creato con successo')
          } catch (e) {
            if (e instanceof ApiError && e.status === 422 && (e as any).errors) {
              const errs = (e as any).errors as Record<string, string[]>
              setFieldErrors(errs)
              // Niente toast specifico: quello generico viene mostrato globalmente
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
                      <button type="button" key={r} onClick={() => setRoles(active ? roles.filter((x) => x !== r) : [...roles, r])} className={`px-3 py-1.5 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{r}</button>
                    )
                  })}
                </div>
                {[...(fieldErrors.roles || []), ...(fieldErrors['roles.*'] || []), ...(fieldErrors['roles.*.exists'] || [])].map((m, i) => (<div key={`rl-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 caratteri" />
                {fieldErrors.password?.map((m, i) => (<div key={`pw-${i}`} className="text-xs text-red-600 mt-1">{m}</div>))}
              </div>
              <div>
                <Label className="text-sm">Conferma password</Label>
                <Input type="password" value={passwordConf} onChange={(e) => setPasswordConf(e.target.value)} placeholder="Ripeti password" />
              </div>
            </div>
            {/* Foto profilo - stile identico ai banner */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Foto profilo</h3>
                {photo && (
                  <Button type="button" variant="destructive" size="sm" onClick={() => { setPhoto(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null) }}>Rimuovi</Button>
                )}
              </div>
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
                        if (!file) { setPhoto(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); return }
                        const url = URL.createObjectURL(file)
                        setPendingImageURL(url)
                        setPendingOriginalName(file.name || null)
                        setOpenCropper(true)
                      }}
                    />
                    <Button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Seleziona immagine
                    </Button>
                    <p className="text-xs text-gray-500">Formato consigliato quadrato (es. 512x512)</p>
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
                <div><span className="text-gray-500 text-xs">Nome</span><div className="font-medium">{firstName || '-'}</div></div>
                <div><span className="text-gray-500 text-xs">Cognome</span><div className="font-medium">{lastName || '-'}</div></div>
                <div><span className="text-gray-500 text-xs">Email</span><div className="font-medium break-all">{email || '-'}</div></div>
                <div><span className="text-gray-500 text-xs">Ruoli</span><div className="font-medium">{roles.length ? roles.join(', ') : '-'}</div></div>
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
                <Button type="submit" disabled={submitting}>{submitting ? 'Creazione...' : 'Crea utente'}</Button>
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


