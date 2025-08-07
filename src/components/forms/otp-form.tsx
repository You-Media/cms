'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const otpSchema = z.object({
  otp: z.string().length(6, 'Il codice OTP deve essere di 6 cifre'),
})

type OtpFormData = z.infer<typeof otpSchema>

interface OtpFormProps {
  loginData: {
    email: string
    password: string
    siteId: string
  }
  onBack: () => void
}

export function OtpForm({ loginData, onBack }: OtpFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  })

  const handleSubmit = async (data: OtpFormData) => {
    setIsLoading(true)
    try {
      // Qui andrà la chiamata API per verificare l'OTP
      console.log('OTP data:', { ...loginData, otp: data.otp })
      // Se l'OTP è valido, reindirizza alla dashboard
      // router.push('/dashboard')
    } catch (error) {
      console.error('OTP verification error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Codice OTP inviato a <strong>{loginData.email}</strong>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codice OTP</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onBack}
            >
              Indietro
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Verifica...' : 'Verifica Codice'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Non hai ricevuto il codice?{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-500 font-medium"
            onClick={() => {
              // Qui andrà la logica per reinviare l'OTP
              console.log('Resend OTP')
            }}
          >
            Invia di nuovo
          </button>
        </p>
      </div>
    </div>
  )
}
