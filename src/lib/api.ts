import { API_ENDPOINTS, buildApiUrl } from '@/config/endpoints';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private tempAuthToken: string | null = null;
  private selectedSite: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;
  private onTokenRefreshedCallback: ((newToken: string) => void) | null = null;
  private onAuthFailureCallback: (() => void) | null = null;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_ENDPOINTS.BASE_URL;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
    options?: { skipAuthRefresh?: boolean }
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders.Authorization = `Bearer ${this.token}`;
    }

    if (this.tempAuthToken) {
      requestHeaders['X-Temp-Auth-Token'] = this.tempAuthToken;
    }

    // Aggiungi sempre l'header X-Site se disponibile
    if (this.selectedSite) {
      requestHeaders['X-Site'] = this.selectedSite;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Gestione 401 con fallback refresh, esclusi gli endpoint pubblici e il refresh stesso
        if (
          response.status === 401 &&
          !options?.skipAuthRefresh &&
          endpoint !== API_ENDPOINTS.AUTH.REFRESH &&
          endpoint !== API_ENDPOINTS.AUTH.LOGIN &&
          endpoint !== API_ENDPOINTS.AUTH.VERIFY_OTP &&
          endpoint !== API_ENDPOINTS.AUTH.FORGOT_PASSWORD &&
          endpoint !== API_ENDPOINTS.AUTH.RESET_PASSWORD
        ) {
          const refreshed = await this.handleTokenRefresh();
          if (refreshed) {
            // Riprova una sola volta con skipAuthRefresh per evitare loop
            return this.request<T>(method, endpoint, data, headers, { skipAuthRefresh: true });
          }
        }

        let errorData = {};
        let serverMessage = '';
        
        try {
          errorData = await response.json();
          serverMessage = (errorData as any).message || (errorData as any).error || (errorData as any).detail;
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }
        
        throw new ApiError(response.status, serverMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Gestione errori di rete più specifica
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(0, 'Errore di connessione - Verifica la connessione internet');
      }
      
      throw new ApiError(0, error instanceof Error ? error.message : 'Errore di rete');
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', endpoint, data, headers);
  }

  async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, headers);
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  setTempAuthToken(tempAuthToken: string) {
    this.tempAuthToken = tempAuthToken;
  }

  clearTempAuthToken() {
    this.tempAuthToken = null;
  }

  setSelectedSite(site: string) {
    this.selectedSite = site;
  }

  clearSelectedSite() {
    this.selectedSite = null;
  }

  onTokenRefreshed(cb: (newToken: string) => void) {
    this.onTokenRefreshedCallback = cb;
  }

  onAuthFailure(cb: () => void) {
    this.onAuthFailureCallback = cb;
  }

  private async handleTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      try {
        const newToken = await (this.refreshPromise as Promise<string>);
        if (newToken) return true;
        return false;
      } catch {
        return false;
      }
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      const newToken = await this.refreshPromise;
      if (newToken) {
        this.setToken(newToken);
        if (this.onTokenRefreshedCallback) {
          this.onTokenRefreshedCallback(newToken);
        }
        return true;
      }
      return false;
    } catch (error) {
      // Fallimento refresh: pulisci token e notifica
      this.clearToken();
      if (this.onAuthFailureCallback) {
        this.onAuthFailureCallback();
      }
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async refreshToken(): Promise<string> {
    // Assumi che il backend usi cookie httpOnly per refresh, oppure accetti bearer esistente
    const res = await this.post<{ status: string; message: string; data: { access_token: string; expires_in?: number } }>(API_ENDPOINTS.AUTH.REFRESH, {});
    const newToken = res?.data?.access_token;
    if (!newToken) {
      throw new ApiError(401, 'Impossibile rinnovare il token');
    }
    return newToken;
  }

  async getMe(): Promise<{ status: string; message: string; data: any }> {
    return this.get(API_ENDPOINTS.AUTH.ME);
  }

  // Metodo specifico per generare nuovo OTP
  async generateOtp(): Promise<{ status: string; message: string; data: { message: string; expires_in: number } }> {
    return this.post<{ status: string; message: string; data: { message: string; expires_in: number } }>(API_ENDPOINTS.OTP.GENERATE);
  }

  // Metodo specifico per verificare OTP
  async verifyOtp(email: string, otp: string, tempAuthToken: string): Promise<{ status: string; message: string; data: { access_token: string; token_type: string; expires_in: number; user: any; last_login_at: string } }> {
    return this.post<{ status: string; message: string; data: { access_token: string; token_type: string; expires_in: number; user: any; last_login_at: string } }>(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      email,
      otp,
      temp_auth_token: tempAuthToken,
    });
  }

  // Forgot password: invia link reset via email
  async forgotPassword(email: string, site?: string): Promise<{ status: string; message: string; data?: { message: string } }> {
    const headers = site ? { 'X-Site': site } : undefined
    try {
      return await this.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }, headers)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new AuthError(error.status, error.message)
      }
      throw error
    }
  }

  // Reset password con token
  async resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }, site?: string): Promise<{ status: string; message: string }> {
    const headers = site ? { 'X-Site': site } : undefined
    try {
      return await this.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload, headers)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new AuthError(error.status, error.message)
      }
      throw error
      }
  }
}

export class ApiError extends Error {
  constructor(public status: number, message?: string) {
    // Passa il messaggio del server per la mappatura specifica
    super(ApiError.getErrorMessage(status, message));
    this.name = 'ApiError';
  }

  static getErrorMessage(status: number, serverMessage?: string): string {
    // Mappatura specifica per messaggi del server
    const serverMessageMap: Record<string, string> = {
      'No team found for current site': 'Sito non trovato o accesso negato',
      'Invalid credentials': 'Credenziali non valide',
      'User not found': 'Utente non trovato',
      'Account disabled': 'Account disabilitato',
      'Codice OTP non valido o scaduto': 'Codice OTP non valido o scaduto',
      'Invalid OTP': 'Codice OTP non valido',
      'OTP expired': 'Codice OTP scaduto',
      'OTP already used': 'Codice OTP già utilizzato',
      'Too many OTP attempts': 'Troppi tentativi OTP - Riprova più tardi',
    };

    // Se abbiamo un messaggio del server mappato, usalo
    if (serverMessage && serverMessageMap[serverMessage]) {
      return serverMessageMap[serverMessage];
    }

    // Altrimenti usa la mappatura per status code
    const errorMessages: Record<number, string> = {
      0: 'Errore di connessione - Verifica la connessione internet',
      400: 'Richiesta non valida',
      401: 'Non autorizzato - Effettua il login',
      403: 'Accesso negato',
      404: 'Risorsa non trovata',
      409: 'Conflitto - La risorsa esiste già',
      422: 'Dati non validi - Verifica i campi',
      429: 'Troppe richieste - Riprova più tardi',
      500: 'Errore interno del server',
      502: 'Errore del gateway',
      503: 'Servizio non disponibile',
      504: 'Timeout del gateway',
    };

    return errorMessages[status] || `Errore ${status} - Si è verificato un problema`;
  }

  static isClientError(status: number): boolean {
    return status >= 400 && status < 500;
  }

  static isServerError(status: number): boolean {
    return status >= 500;
  }

  get isClientError(): boolean {
    return ApiError.isClientError(this.status);
  }

  get isServerError(): boolean {
    return ApiError.isServerError(this.status);
  }
}

// Classe di errore personalizzata per l'autenticazione
export class AuthError extends Error {
  constructor(public status: number, message?: string) {
    super(AuthError.getErrorMessage(status, message));
    this.name = 'AuthError';
  }
 
  static getErrorMessage(status: number, serverMessage?: string): string {
    // Mappatura specifica per errori di autenticazione
    const authErrorMessages: Record<number, string> = {
      0: 'Errore di connessione - Verifica la connessione internet',
      400: 'Richiesta non valida',
      401: 'Non autorizzato - Effettua il login',
      403: 'Accesso negato',
      404: 'Utente non trovato', // Mappa 404 a "Utente non trovato" per l'auth
      409: 'Conflitto - La risorsa esiste già',
      422: 'Dati non validi - Verifica i campi',
      429: 'Troppe richieste - Riprova più tardi',
      500: 'Errore interno del server',
      502: 'Errore del gateway',
      503: 'Servizio non disponibile',
      504: 'Timeout del gateway',
    };
 
    return authErrorMessages[status] || `Errore ${status} - Si è verificato un problema`;
  }
}

// Istanza globale
export const api = new ApiClient();
