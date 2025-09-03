'use client'

import { useMemo, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { resetPasswordSchema, type ResetPasswordForm } from '@/lib/validations'
import { api, AuthError } from '@/lib/api'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/config/routes'
import { useSites } from '@/hooks/use-sites'
import React from 'react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md w-full mx-auto rounded-xl p-6"><div className="text-sm text-gray-500">Caricamento…</div></div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const emailParam = searchParams.get('email') || ''
  const siteParam = searchParams.get('site') || ''
  const [isLoading, setIsLoading] = useState(false)
  const { activeSites } = useSites()

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, email: emailParam, site: siteParam || activeSites[0]?.id || '', password: '', password_confirmation: '' },
  })

  // Aggiorna il campo site se manca dall'URL ma è disponibile nei siti attivi
  React.useEffect(() => {
    if (!siteParam && activeSites.length > 0 && !form.getValues('site')) {
      form.setValue('site', activeSites[0].id)
    }
  }, [siteParam, activeSites, form])

  const passwordHints = useMemo(() => ([
    'Minimo 8 caratteri',
    'Lettera maiuscola',
    'Lettera minuscola',
    'Numero',
    'Carattere speciale',
  ]), [])

  const onSubmit = async (values: ResetPasswordForm) => {
    // Controlla se tutti i campi richiesti sono presenti
    if (!values.site) {
      toast.error('Errore', {
        description: 'Sito mancante. Riprova dal link email.',
      })
      return
    }

    setIsLoading(true)
    try {
      await api.resetPassword(values, values.site)
      toast.success('Password aggiornata', {
        description: 'Ora puoi accedere con la nuova password.',
      })
      router.push(APP_ROUTES.AUTH.LOGIN)
    } catch (error) {
      // Gestisci errori specifici
      let errorMessage = 'Impossibile aggiornare la password'

      if (error instanceof AuthError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast.error('Errore', {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl p-6 shadow">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Reimposta Password</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Imposta una password che rispetti i requisiti minimi.
      </p>

      <ul className="text-xs text-gray-600 dark:text-gray-400 mb-6 list-disc list-inside">
        {passwordHints.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <FormField
            control={form.control}
            name="token"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input type="hidden" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="site"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input type="hidden" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nuova password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password_confirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conferma password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Aggiornamento...' : 'Reimposta password'}
          </Button>
          
        </form>
      </Form>
    </div>
  )
}

