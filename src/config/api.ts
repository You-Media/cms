export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  ENDPOINTS: {
    LOGIN: '/auth/login',
  },
}; 