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
  permissions: string[];
}

export type UserRole = 'super_admin' | 'site_admin' | 'editor' | 'viewer';

export interface Permission {
  action: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'manage';
  resource: 'sites' | 'content' | 'media' | 'users' | 'settings' | 'analytics';
  scope: 'global' | 'site' | 'own';
  siteIds?: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'in' | 'not_in';
  value: any;
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
