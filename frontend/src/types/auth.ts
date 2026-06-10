export interface AuthUser {
  userId: string;
  nome: string;
  email: string;
  isAdmin: boolean;
  requiresPasswordChange: boolean;
}

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  temp_ativa: number;
  is_admin: number;
  created_at: number;
  last_login: number | null;
}
