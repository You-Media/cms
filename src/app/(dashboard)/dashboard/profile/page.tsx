"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import ImageCropperModal from '@/components/forms/image-cropper-modal'

const profileSchema = z.object({
  first_name: z.string().max(255).optional(),
  last_name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).optional(),
  remove_profile_photo: z.boolean().optional(),
  profile_photo: z.any().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { setUser } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Image cropper state
  const [openCropper, setOpenCropper] = useState(false)
  const [pendingImageURL, setPendingImageURL] = useState<string | null>(null)
  const [pendingOriginalName, setPendingOriginalName] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const isDefaultPhoto = (photoPreview && photoPreview.includes('images/default-propic.png')) || false

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      email: user?.email || '',
      remove_profile_photo: false,
    },
  })

  // Initialize photo preview with existing user photo
  useEffect(() => {
    if (user?.profile?.profile_photo) {
      setPhotoPreview(user.profile.profile_photo)
    }
  }, [user?.profile?.profile_photo])

  const onSubmit = async (values: ProfileForm) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      
      // Add _method field for PHP compatibility
      formData.append('_method', 'PATCH')
      
      Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        if (key === 'profile_photo') return // Skip this, we handle it separately
        formData.append(key, String(value))
      })

      // Handle profile photo separately
      if (photo) {
        formData.append('profile_photo', photo)
      }
      // Always pass remove_profile_photo as 0 or 1
      formData.append('remove_profile_photo', removePhoto ? '1' : '0')

      const res = await api.updateMyProfile(formData)
      if (res?.data) {
        setUser(res.data)
      }
      toast.success('Profilo aggiornato')
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || 'Impossibile aggiornare il profilo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifica Profilo</h1>
        <p className="text-sm text-muted-foreground">Aggiorna le informazioni del tuo account.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Mario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cognome</FormLabel>
                  <FormControl>
                    <Input placeholder="Rossi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="mario.rossi@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    <div className="text-xs text-gray-500 dark:text-gray-400">Trascina o seleziona un'immagine</div>
                  )}
                </button>
                <div className="space-y-2">
                  <input
                    id="profile_file_input"
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
                    <Button type="button" onClick={() => {
                      const inputEl = fileInputRef.current || (document.getElementById('profile_file_input') as HTMLInputElement | null)
                      if (inputEl) {
                        // Reset value so selecting the same file triggers onChange
                        inputEl.value = ''
                        inputEl.click()
                      }
                    }} className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700">
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
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </div>
        </form>
      </Form>

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
          // Uncheck remove photo when adding new photo
          setRemovePhoto(false)
        }}
      />
    </div>
  )
}



