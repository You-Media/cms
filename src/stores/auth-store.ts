import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/endpoints';
import type { LoginCredentials, LoginResponse, User, AuthState } from '@/types/auth';
import type { LoginApiCredentials, OtpResponse, OtpData, OtpVerifyResponse } from '@/lib/validations';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials, site: string) => Promise<OtpData | null>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
  otpData: OtpData | null;
  setOtpData: (otpData: OtpData | null) => void;
  isTempTokenValid: () => boolean;
  clearTempToken: () => void;
  generateNewOtp: () => Promise<OtpData>;
  verifyOtp: (otp: string) => Promise<{ user: User; token: string }>;
  selectedSite: string | null;
  setSelectedSite: (site: string) => void;
  clearSelectedSite: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      otpData: null,
      selectedSite: null,

      login: async (credentials: LoginCredentials, site: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Imposta il sito selezionato
          api.setSelectedSite(site);
          
          // Crea le credenziali API senza il site
          const apiCredentials: LoginApiCredentials = {
            email: credentials.email,
            password: credentials.password,
          };
          const response = await api.post<OtpResponse>(API_ENDPOINTS.AUTH.LOGIN, apiCredentials, {
            'X-Site': site,
          });

          // Se richiede OTP, salva i dati temporanei
          if (response.data.requires_otp) {
            const otpData: OtpData = {
              temp_auth_token: response.data.temp_auth_token,
              expires_in: response.data.expires_in,
              token_expires_in: response.data.token_expires_in,
              email: credentials.email,
              site: site,
              created_at: Date.now(),
            };
            
            set({
              otpData,
              selectedSite: site,
              isLoading: false,
              error: null,
            });
            
            return otpData;
          }

          // Se non richiede OTP, procedi con il login normale
          const loginResponse = response as unknown as LoginResponse;
          api.setToken(loginResponse.data.access_token);

          set({
            user: loginResponse.data.user,
            token: loginResponse.data.access_token,
            selectedSite: site,
            isLoading: false,
            error: null,
            otpData: null,
          });
          
          return null;
        } catch (error) {
          // L'errore è già gestito dalla classe ApiError con messaggi localizzati
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Errore di login',
            otpData: null,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Chiama l'API di logout per invalidare il token
          await api.post(API_ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
          console.error('Logout API error:', error);
          // Non bloccare il logout se l'API fallisce
        } finally {
          // Pulisci sempre i dati locali anche se l'API fallisce
          api.clearToken();
          api.clearSelectedSite();
          api.clearTempAuthToken();
          set({
            user: null,
            token: null,
            isLoading: false,
            error: null,
            otpData: null,
            selectedSite: null,
          });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        api.setToken(token);
        set({ token });
      },

      clearError: () => {
        set({ error: null });
      },

      setOtpData: (otpData: OtpData | null) => {
        set({ otpData });
      },

      // Verifica se il token temporaneo è ancora valido
      isTempTokenValid: () => {
        const { otpData } = get();
        if (!otpData) return false;
        
        const now = Date.now();
        const tokenExpiryTime = otpData.token_expires_in * 1000; // Converti in millisecondi
        const actualExpiryTime = otpData.created_at + tokenExpiryTime;
        
        return now < actualExpiryTime;
      },

      // Pulisce il token temporaneo
      clearTempToken: () => {
        set({ otpData: null });
      },

      // Gestione sito selezionato
      setSelectedSite: (site: string) => {
        set({ selectedSite: site });
        api.setSelectedSite(site);
      },

      clearSelectedSite: () => {
        set({ selectedSite: null });
        api.clearSelectedSite();
      },

      // Genera un nuovo OTP
      generateNewOtp: async () => {
        const { otpData, selectedSite } = get();
        if (!otpData) {
          throw new Error('Nessun token temporaneo disponibile');
        }

        if (!get().isTempTokenValid()) {
          throw new Error('Token temporaneo scaduto');
        }

        try {
          // Assicurati che il sito sia impostato
          if (selectedSite) {
            api.setSelectedSite(selectedSite);
          }

          // Imposta il token temporaneo nell'API client
          api.setTempAuthToken(otpData.temp_auth_token);
          
          // Genera nuovo OTP
          const response = await api.generateOtp();
          
          // Aggiorna i dati OTP con nuovo timestamp e nuovo tempo di scadenza
          const updatedOtpData: OtpData = {
            ...otpData,
            created_at: Date.now(),
            expires_in: response.data.expires_in, // Usa il nuovo expires_in dalla risposta
          };
          
          set({ otpData: updatedOtpData });
          
          // Pulisci il token temporaneo dall'API client
          api.clearTempAuthToken();
          return updatedOtpData;
        } catch (error) {
          // Pulisci il token temporaneo dall'API client in caso di errore
          api.clearTempAuthToken();
          throw error;
        }
      },

      // Verifica OTP e completa il login
      verifyOtp: async (otp: string) => {
        const { otpData, selectedSite } = get();
        if (!otpData) {
          throw new Error('Nessun token temporaneo disponibile');
        }

        if (!get().isTempTokenValid()) {
          throw new Error('Token temporaneo scaduto');
        }

        try {
          // Assicurati che il sito sia impostato
          if (selectedSite) {
            api.setSelectedSite(selectedSite);
          }

          // Verifica OTP
          const response = await api.verifyOtp(otpData.email, otp, otpData.temp_auth_token);
          
          // Estrai il token dalla risposta
          const token = response.data.access_token;
          
          if (!token) {
            throw new Error('Token non trovato nella risposta API');
          }
          
          // Imposta il token permanente nell'API client
          api.setToken(token);
          
          // Aggiorna lo stato con i dati dell'utente
          set({
            user: response.data.user,
            token: token,
            isLoading: false,
            error: null,
            otpData: null, // Pulisci i dati OTP
          });
          
          // Pulisci il token temporaneo dall'API client
          api.clearTempAuthToken();
          
          return {
            user: response.data.user,
            token: token,
          };
        } catch (error) {
          // Pulisci il token temporaneo dall'API client in caso di errore
          api.clearTempAuthToken();
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        otpData: state.otpData,
        selectedSite: state.selectedSite,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          // Ripristina il token e il sito nell'API client
          api.setToken(state.token);
          if (state.selectedSite) {
            api.setSelectedSite(state.selectedSite);
          }
        }
      },
    }
  )
);
