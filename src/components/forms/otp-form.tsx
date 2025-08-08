'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { otpSchema } from '@/lib/validations'
import type { OtpFormData, OtpData } from '@/lib/validations'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/config/routes'

interface OtpFormProps {
  otpData: OtpData
  onBack: () => void
}

export function OtpForm({ otpData, onBack }: OtpFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginCompleted, setLoginCompleted] = useState(false) // Nuovo stato per tracciare login completato
  const [timeLeft, setTimeLeft] = useState(() => {
    // Calcola il tempo rimanente basandosi sul timestamp di creazione
    const now = Date.now();
    const elapsed = Math.floor((now - otpData.created_at) / 1000);
    const remaining = Math.max(0, otpData.expires_in - elapsed);
    return remaining;
  })
  const [canResend, setCanResend] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const { clearError } = useAuthStore()
  const toastShownRef = useRef(false)

  const form = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  })

  // Timer per il countdown
  useEffect(() => {
    // Se il tempo è già scaduto, abilita il reinvio
    if (timeLeft <= 0) {
      setCanResend(true)
      // Mostra toast quando il timer scade (solo una volta)
      if (!toastShownRef.current) {
        toast.warning('Codice OTP scaduto', {
          description: 'Il codice OTP è scaduto. Puoi richiederne uno nuovo.',
          duration: 4000,
        })
        toastShownRef.current = true
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 1)
        if (newTime === 0) {
          setCanResend(true)
          // Mostra toast quando il timer scade (solo una volta)
          if (!toastShownRef.current) {
            toast.warning('Codice OTP scaduto', {
              description: 'Il codice OTP è scaduto. Puoi richiederne uno nuovo.',
              duration: 4000,
            })
            toastShownRef.current = true
          }
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Monitora la validità del token temporaneo (solo se il login non è ancora completato)
  useEffect(() => {
    // Non controllare se il login è già completato
    if (loginCompleted) return
    
    const { isTempTokenValid, clearTempToken, user, token } = useAuthStore.getState()
    
    // Se l'utente è già loggato (ha user e token), non controllare il temp token
    if (user && token) return
    
    if (!isTempTokenValid()) {
      // Token scaduto, puliscilo e torna al login
      clearTempToken()
      toast.error('Sessione scaduta', {
        description: 'Devi effettuare di nuovo il login per continuare.',
        duration: 5000,
      })
      onBack()
    }
  }, [onBack, loginCompleted])

  // Formatta il tempo rimanente in mm:ss
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (data: OtpFormData) => {
    setIsLoading(true)
    setVerifyError(null) // Pulisci errori precedenti
    try {
      clearError()
      const { verifyOtp, isTempTokenValid, clearTempToken } = useAuthStore.getState()
      
      // Verifica se il token è ancora valido
      if (!isTempTokenValid()) {
        // Token scaduto, puliscilo e torna al login
        clearTempToken()
        toast.error('Sessione scaduta', {
          description: 'Devi effettuare di nuovo il login per continuare.',
          duration: 5000,
        })
        onBack() // Torna al login
        return
      }
      
                const result = await verifyOtp(data.otp)
          
          // Imposta login completato per evitare controlli sul token temporaneo
          setLoginCompleted(true)
          
          // Toast di successo
          toast.success('Login completato', {
            description: 'Accesso effettuato con successo!',
            duration: 3000,
          })
          
          // Aspetta un momento per permettere a Zustand di persistere lo stato
          setTimeout(() => {
            router.push(APP_ROUTES.DASHBOARD.HOME)
          }, 100)
      
    } catch (error) {
      // Se l'errore è relativo al token scaduto, puliscilo e torna al login
      if (error instanceof Error && (
        error.message.includes('Token temporaneo scaduto') || 
        error.message.includes('Nessun token temporaneo disponibile')
      )) {
        const { clearTempToken } = useAuthStore.getState()
        clearTempToken()
        toast.error('Sessione scaduta', {
          description: 'Devi effettuare di nuovo il login per continuare.',
          duration: 5000,
        })
        onBack() // Torna al login
        return
      }
      
      setVerifyError(error instanceof Error ? error.message : 'Errore durante la verifica del codice OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!canResend || loginCompleted) return // Non resendere se login completato
    
    setIsLoading(true)
    setResendError(null) // Pulisci errori precedenti
    try {
      const { generateNewOtp, isTempTokenValid, clearTempToken } = useAuthStore.getState()
      
      // Verifica se il token è ancora valido
      if (!isTempTokenValid()) {
        // Token scaduto, puliscilo e torna al login
        clearTempToken()
        toast.error('Sessione scaduta', {
          description: 'Devi effettuare di nuovo il login per continuare.',
          duration: 5000,
        })
        onBack() // Torna al login
        return
      }
      
      const updatedOtpData = await generateNewOtp()
      
      // Reset timer con il nuovo valore dalla risposta API
      const newTimeLeft = Math.max(0, Math.floor(updatedOtpData.expires_in))
      setTimeLeft(newTimeLeft)
      setCanResend(false)
      toastShownRef.current = false // Reset del ref per il nuovo timer
      
      // Toast di successo
      toast.success('Codice OTP inviato', {
        description: 'Un nuovo codice è stato inviato alla tua email.',
        duration: 3000,
      })
      
      // I dati OTP sono già aggiornati nello store
    } catch (error) {
      console.error('Resend OTP error:', error)
      
      // Se l'errore è relativo al token scaduto, puliscilo e torna al login
      if (error instanceof Error && (
        error.message.includes('Token temporaneo scaduto') || 
        error.message.includes('Nessun token temporaneo disponibile')
      )) {
        const { clearTempToken } = useAuthStore.getState()
        clearTempToken()
        toast.error('Sessione scaduta', {
          description: 'Devi effettuare di nuovo il login per continuare.',
          duration: 5000,
        })
        onBack() // Torna al login
        return
      }
      
      setResendError(error instanceof Error ? error.message : 'Errore durante il reinvio del codice OTP')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Codice OTP inviato a <strong className="text-amber-600 dark:text-amber-400">{otpData.email}</strong>
        </p>
        
        {/* Timer */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            Tempo rimanente per inserire il codice:
          </p>
          <p className={`text-2xl font-bold ${timeLeft <= 30 && timeLeft > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatTime(timeLeft)}
          </p>
          {timeLeft <= 30 && timeLeft > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Il codice scadrà presto!
            </p>
          )}
          {timeLeft <= 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Il codice è scaduto. Puoi richiederne uno nuovo.
            </p>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Codice OTP
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {verifyError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{verifyError}</p>
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onBack}
              disabled={isLoading}
            >
              Indietro
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || timeLeft <= 0}
            >
              {isLoading ? 'Verifica...' : timeLeft <= 0 ? 'Codice scaduto' : 'Verifica Codice'}
            </Button>
          </div>
        </form>
      </Form>

      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Non hai ricevuto il codice?{' '}
          <button
            type="button"
            className={`font-medium transition-colors ${
              canResend 
                ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300' 
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleResendOtp}
            disabled={!canResend || isLoading}
          >
            {isLoading ? 'Invio in corso...' : canResend ? 'Invia di nuovo' : `Invia di nuovo (${formatTime(timeLeft)})`}
          </button>
        </p>
        {resendError && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            {resendError}
          </p>
        )}
      </div>
    </div>
  )
}
