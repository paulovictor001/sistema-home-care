import { createContext } from "react";

export interface SessionUser {
  id: number;
  cpf: string;
  email: string;
  first_name: string;
  last_name: string;
  groups: string[];
}

export interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (cpf: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
