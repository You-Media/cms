'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/lib/validations'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordForm) => {
    setIsLoading(true)
    try {
      await api.forgotPassword(values.email)
      toast.success('Email inviata', {
        description: 'Se l\'indirizzo è corretto, riceverai un link per reimpostare la password.',
      })
    } catch (error) {
      toast.error('Errore', {
        description: error instanceof Error ? error.message : 'Impossibile inviare il link',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl p-6 shadow">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Recupera Password</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Inserisci la tua email. Ti invieremo un link per reimpostare la password.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="nome@dominio.it" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Invio in corso...' : 'Invia link di reset'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
