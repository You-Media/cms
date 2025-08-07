export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  articleFilterPreferences?: ArticleFilterPreferences;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  siteIds: string[];
  permissions: Permission[];
  metadata?: {
    department?: string;
    lastLogin?: Date;
    preferences?: Record<string, any>;
  };
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
