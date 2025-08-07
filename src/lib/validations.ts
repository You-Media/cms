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
