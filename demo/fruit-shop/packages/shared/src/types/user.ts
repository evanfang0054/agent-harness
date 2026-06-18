export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface LoginDTO {
  phone: string;
  password: string;
}

export interface RegisterDTO {
  phone: string;
  password: string;
  nickname?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
