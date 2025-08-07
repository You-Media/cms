class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData = {};
        let serverMessage = '';
        
        try {
          errorData = await response.json();
          serverMessage = (errorData as any).message || (errorData as any).error || (errorData as any).detail;
        } catch (parseError) {
          // Se il parsing JSON fallisce, usa il messaggio di default per lo status
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
      422: 'Dati non validi',
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

// Istanza globale
export const api = new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!);
