export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: 'success';
  message: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
    last_login_at: string;
  };
}

export interface UserProfile {
  id: number;
  team_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_photo: string;
}

export interface User {
  id: number;
  email: string;
  email_verified_at: string | null;
  profile: UserProfile;
  created_at: string | null;
  updated_at: string | null;
  roles: string[];
  permissions: Array<string | PermissionItem>;
}

// Struttura permesso lato API per /me e /users
export interface PermissionItem {
  name: string;
  display_name: string;
  description?: string;
}

export interface ArticleFilterPreferences {
  categories?: string[];
  tags?: string[];
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
