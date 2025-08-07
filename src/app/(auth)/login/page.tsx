'use client'

import { useState } from 'react'
import { LoginForm } from '@/components/forms/login-form'
import { OtpForm } from '@/components/forms/otp-form'
import type { LoginFormData } from '@/lib/validations'


export default function LoginPage() {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [loginData, setLoginData] = useState<LoginFormData | null>(null)

  const handleCredentialsSubmit = (data: LoginFormData) => {
    setLoginData(data)
    setStep('otp')
  }

  const handleBackToCredentials = () => {
    setStep('credentials')
    setLoginData(null)
  }

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

      {step === 'credentials' ? (
        <LoginForm onSubmit={handleCredentialsSubmit} />
      ) : (
        <OtpForm 
          loginData={loginData!}
          onBack={handleBackToCredentials}
        />
      )}
    </div>
  )
}
