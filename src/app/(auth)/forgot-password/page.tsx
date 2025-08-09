'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/lib/validations'
import { api, AuthError } from '@/lib/api'
import { toast } from 'sonner'
import { useSites } from '@/hooks/use-sites'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const { activeSites } = useSites()

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', site: '' },
  })

  // Gestisce l'idratazione per evitare mismatch server/client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Recupera il cooldown dal localStorage solo dopo l'idratazione
  useEffect(() => {
    if (isClient) {
      const savedCooldown = localStorage.getItem('forgotPasswordCooldown')
      if (savedCooldown) {
        try {
          const { endTime } = JSON.parse(savedCooldown)
          const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
          if (remaining > 0) {
            setCooldown(remaining)
          } else {
            // Rimuovi il cooldown scaduto
            localStorage.removeItem('forgotPasswordCooldown')
          }
        } catch (error) {
          // Se c'è un errore nel parsing, rimuovi il dato corrotto
          localStorage.removeItem('forgotPasswordCooldown')
        }
      }
    }
  }, [isClient])

  // Aggiorna il campo site quando activeSites cambia
  useEffect(() => {
    if (activeSites.length > 0) {
      form.setValue('site', activeSites[0].id)
    }
  }, [activeSites, form])

  // Timer per il cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            // Rimuovi il cooldown dal localStorage quando scade
            if (isClient) {
              localStorage.removeItem('forgotPasswordCooldown')
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [cooldown, isClient])

  const onSubmit = async (values: ForgotPasswordForm) => {
    // Controlla se c'è un sito selezionato
    if (!values.site) {
      toast.error('Errore', {
        description: 'Devi selezionare un sito prima di procedere.',
      })
      return
    }

    setIsLoading(true)
    try {
      await api.forgotPassword(values.email, values.site)
      toast.success('Email inviata', {
        description: 'Se l\'indirizzo è corretto, riceverai un link per reimpostare la password.',
      })
      // Attiva il cooldown di 2 minuti (120 secondi)
      setCooldown(120)
      // Salva il cooldown nel localStorage con il timestamp di fine
      if (isClient) {
        const endTime = Date.now() + (120 * 1000)
        localStorage.setItem('forgotPasswordCooldown', JSON.stringify({ endTime }))
      }
    } catch (error) {
      // Gestisci errori specifici
      let errorMessage = 'Impossibile inviare il link'
      
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

  // Formatta il tempo rimanente
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
            name="site"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sito Web</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona il sito da gestire" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{site.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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

          <Button type="submit" className="w-full" disabled={isLoading || cooldown > 0}>
            {isLoading ? 'Invio in corso...' : cooldown > 0 ? `Riprova tra ${formatTime(cooldown)}` : 'Invia link di reset'}
          </Button>
          
        </form>
      </Form>
    </div>
  )
}

