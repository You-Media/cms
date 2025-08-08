import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password richiesta'),
  site: z.string().min(1, 'Sito richiesto'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Tipo per le credenziali API (senza site)
export type LoginApiCredentials = {
  email: string;
  password: string;
};

export const otpSchema = z.object({
  otp: z.string().length(6, 'Il codice OTP deve essere di 6 cifre'),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// Tipi per la verifica OTP
export interface OtpVerifyRequest {
  email: string;
  otp: string;
  temp_auth_token: string;
}

export interface OtpVerifyResponse {
  status: 'success';
  message: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: any; // Useremo il tipo User da auth.ts
    last_login_at: string;
  };
}

// Tipi per la risposta OTP
export interface OtpResponse {
  status: 'success';
  message: string;
  data: {
    requires_otp: boolean;
    temp_auth_token: string;
    message: string;
    expires_in: number;
    token_expires_in: number;
  };
}

export interface OtpGenerateResponse {
  status: 'success';
  message: string;
  data: {
    message: string;
    expires_in: number;
  };
}

export interface OtpData {
  temp_auth_token: string;
  expires_in: number;
  token_expires_in: number;
  email: string;
  site: string;
  created_at: number; // Timestamp di creazione in millisecondi
}

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email non valida').max(255, 'Email troppo lunga'),
})
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  email: z.string().email('Email non valida').max(255, 'Email troppo lunga'),
  token: z.string().min(1, 'Token mancante').max(255, 'Token non valido'),
  password: z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .max(255)
    .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
    .regex(/[a-z]/, 'Almeno una lettera minuscola')
    .regex(/[0-9]/, 'Almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'Almeno un carattere speciale'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Le password non coincidono',
})
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
