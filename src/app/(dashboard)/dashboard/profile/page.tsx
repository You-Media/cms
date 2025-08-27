"use client"

import { useState } from 'react'
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

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.profile.first_name || '',
      last_name: user?.profile.last_name || '',
      email: user?.email || '',
      remove_profile_photo: false,
    },
  })

  const onSubmit = async (values: ProfileForm) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        if (key === 'profile_photo' && value instanceof FileList) {
          if (value.length > 0) formData.append('profile_photo', value[0])
          return
        }
        formData.append(key, String(value))
      })

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

          <div className="space-y-4">
            <Label>Foto profilo</Label>
            <Input type="file" accept="image/*" onChange={(e) => form.setValue('profile_photo', e.target.files as any)} />
            <div className="flex items-center space-x-2">
              <input id="remove_profile_photo" type="checkbox" className="h-4 w-4" {...form.register('remove_profile_photo')} />
              <Label htmlFor="remove_profile_photo">Rimuovi foto profilo</Label>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}


