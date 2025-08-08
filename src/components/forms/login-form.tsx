'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { loginSchema } from '@/lib/validations'
import type { LoginFormData } from '@/lib/validations'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useSites } from '@/hooks/use-sites'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore()
  const { activeSites } = useSites()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      site: activeSites[0]?.id || '',
    },
  })

  const handleSubmit = async (data: LoginFormData) => {
    if (isLoading) return
    
    try {
      clearError()
      const otpResponse = await login(data, data.site)
      
      if (otpResponse) {
        // Se richiede OTP, passa i dati OTP
        onSubmit(data)
      } else {
        // Se non richiede OTP, il login è completato
        onSubmit(data)
      }
    } catch (error) {
      // L'errore è già gestito nello store
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Indirizzo Email
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="nome@esempio.com" 
                  type="email"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
              </FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <Link
                href={APP_ROUTES.AUTH.FORGOT_PASSWORD}
                className="mt-1 block text-right text-sm text-amber-600 dark:text-amber-400 hover:underline"
              >
                Password dimenticata?
              </Link>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="site"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sito Web
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona il sito da gestire" />
                  </SelectTrigger>
                </FormControl>
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
              <FormMessage />
            </FormItem>
          )}
        />
        
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        <div className="pt-4">
          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Accesso in corso...</span>
              </div>
            ) : (
              <span className="flex items-center space-x-2">
                <span>Accedi al CMS di YouMedia</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
