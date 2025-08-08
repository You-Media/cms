'use client'

import { useState, useEffect } from 'react'
import { LoginForm } from '@/components/forms/login-form'
import { OtpForm } from '@/components/forms/otp-form'
import type { LoginFormData, OtpData } from '@/lib/validations'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function LoginPage() {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [otpData, setOtpData] = useState<OtpData | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const { otpData: storeOtpData, isTempTokenValid, clearTempToken, selectedSite } = useAuthStore()

  // Verifica se esiste già un token temporaneo valido
  useEffect(() => {
    if (storeOtpData && isTempTokenValid()) {
      // Se il token è ancora valido, passa direttamente al step OTP
      setOtpData(storeOtpData)
      setStep('otp')
    } else if (storeOtpData && !isTempTokenValid()) {
      // Se il token è scaduto, puliscilo e mostra messaggio
      clearTempToken()
      setSessionExpired(true)
      toast.error('Sessione scaduta', {
        description: 'Devi effettuare di nuovo il login per continuare.',
        duration: 5000,
      })
    }
  }, [storeOtpData, isTempTokenValid, clearTempToken])

  // Imposta il sito selezionato nell'API client se disponibile
  useEffect(() => {
    if (selectedSite) {
      api.setSelectedSite(selectedSite)
    }
  }, [selectedSite])

  const handleCredentialsSubmit = async (data: LoginFormData) => {
    try {
      const { login } = useAuthStore.getState()
      const otpResponse = await login(data, data.site)
      
      if (otpResponse) {
        // Se richiede OTP, salva i dati e passa al step OTP
        setOtpData(otpResponse)
        setStep('otp')
        setSessionExpired(false) // Pulisci il messaggio di sessione scaduta
      } else {
        // Se non richiede OTP, il login è completato
        // Qui puoi reindirizzare alla dashboard
        console.log('Login completato senza OTP')
      }
    } catch (error) {
      // L'errore è già gestito nello store
      console.error('Login error:', error)
    }
  }

  const handleBackToCredentials = () => {
    setStep('credentials')
    setOtpData(null)
    setSessionExpired(false) // Pulisci il messaggio di sessione scaduta
    // Pulisci i dati OTP dallo store
    useAuthStore.getState().setOtpData(null)
  }

  // Usa i dati OTP dallo store se disponibili, altrimenti usa quelli locali
  const currentOtpData = storeOtpData || otpData

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-amber-500/10 dark:shadow-amber-500/20 py-8 px-6 sm:px-10">
      {/* Header with gradient */}
      <div className="text-center mb-8">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white-600 dark:text-white-400">
          {step === 'credentials' ? 'Accedi al CMS di YouMedia' : 'Verifica Codice OTP'}
        </h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {step === 'credentials' 
            ? 'Inserisci le tue credenziali per accedere al sistema' 
            : 'Inserisci il codice OTP inviato alla tua email'
          }
        </p>
      </div>

      {/* Messaggio di sessione scaduta */}
      {sessionExpired && step === 'credentials' && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                Sessione scaduta
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                La tua sessione è scaduta. Devi effettuare di nuovo il login.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 'credentials' ? (
        <LoginForm onSubmit={handleCredentialsSubmit} />
      ) : currentOtpData ? (
        <OtpForm 
          otpData={currentOtpData}
          onBack={handleBackToCredentials}
        />
      ) : (
        <div className="text-center text-red-600 dark:text-red-400">
          Errore: dati OTP non disponibili
        </div>
      )}
    </div>
  )
}
