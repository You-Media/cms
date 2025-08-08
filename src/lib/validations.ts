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
    user: any; // Sostituiremo con il tipo User corretto
    token: string;
    article_filter_preferences?: any; // Per utenti editoria
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
