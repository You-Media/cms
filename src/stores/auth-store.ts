import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { LoginCredentials, LoginResponse, User, AuthState } from '@/types/auth';
import type { LoginApiCredentials } from '@/lib/validations';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials, site: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials, site: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Crea le credenziali API senza il site
          const apiCredentials: LoginApiCredentials = {
            email: credentials.email,
            password: credentials.password,
          };
          const response = await api.post<LoginResponse>('/auth/login', apiCredentials, {
            'X-Site': site,
          });

          // Imposta il token nel client API
          api.setToken(response.token);

          set({
            user: response.user,
            token: response.token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // L'errore è già gestito dalla classe ApiError con messaggi localizzati
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Errore di login',
          });
          throw error;
        }
      },

      logout: () => {
        api.clearToken();
        set({
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
