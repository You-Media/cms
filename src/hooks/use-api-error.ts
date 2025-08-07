import { useCallback } from 'react';
import { ApiError } from '@/lib/api';

export function useApiError() {
  const handleError = useCallback((error: unknown): string => {
    if (error instanceof ApiError) {
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Si è verificato un errore imprevisto';
  }, []);

  const getErrorType = useCallback((error: unknown): 'client' | 'server' | 'network' => {
    if (error instanceof ApiError) {
      if (error.isClientError) return 'client';
      if (error.isServerError) return 'server';
    }
    return 'network';
  }, []);

  const shouldRetry = useCallback((error: unknown): boolean => {
    if (error instanceof ApiError) {
      // Non riprovare per errori client (4xx) tranne 429
      if (error.isClientError && error.status !== 429) {
        return false;
      }
      // Riprova per errori server (5xx) e rate limiting (429)
      return error.isServerError || error.status === 429;
    }
    return true; // Riprova per errori di rete
  }, []);

  return {
    handleError,
    getErrorType,
    shouldRetry,
  };
}
