"use client"

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { api, ApiError } from '@/lib/api'
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

  const newPassword = form.watch('new_password')

  const criteria = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
      match: newPassword.length > 0 && newPassword === form.getValues('new_password_confirmation'),
    }
  }, [newPassword, form])

  const onSubmit = async (values: ChangePasswordForm) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.changePassword(values, { suppressGlobalToasts: true })
      toast.success('Password aggiornata')
      form.reset()
    } catch (error: any) {
      if (error instanceof ApiError && error.message === 'Current password is incorrect') {
        toast.error('La password attuale non è corretta')
      } else {
        toast.error(error?.message || 'Impossibile aggiornare la password')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const CriteriaItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
      <span>{label}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sicurezza</h1>
        <p className="text-sm text-muted-foreground">Aggiorna la tua password di accesso.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password attuale</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
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

          {/* Live password criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <CriteriaItem ok={criteria.length} label="Minimo 8 caratteri" />
            <CriteriaItem ok={criteria.upper} label="Almeno una lettera maiuscola" />
            <CriteriaItem ok={criteria.lower} label="Almeno una lettera minuscola" />
            <CriteriaItem ok={criteria.number} label="Almeno un numero" />
            <CriteriaItem ok={criteria.special} label="Almeno un carattere speciale" />
            <CriteriaItem ok={criteria.match} label="Le password coincidono" />
          </div>

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



