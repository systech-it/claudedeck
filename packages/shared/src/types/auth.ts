export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
