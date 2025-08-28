"use client"

import { useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Password attuale richiesta'),
  new_password: z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .max(255)
    .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
    .regex(/[a-z]/, 'Almeno una lettera minuscola')
    .regex(/[0-9]/, 'Almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'Almeno un carattere speciale'),
  new_password_confirmation: z.string(),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  path: ['new_password_confirmation'],
  message: 'Le password non coincidono',
})

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export default function SecurityPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  })

  const onSubmit = async (values: ChangePasswordForm) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.changePassword(values)
      toast.success('Password aggiornata')
      form.reset()
    } catch (error: any) {
      toast.error(error?.message || 'Impossibile aggiornare la password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sicurezza</h1>
        <p className="text-sm text-muted-foreground">Aggiorna la tua password di accesso.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password attuale</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nuova password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="new_password_confirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conferma nuova password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Aggiornamento...' : 'Aggiorna password'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}



