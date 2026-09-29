import { createContext } from "react";

export interface SessionUserCategory {
  id: number;
  name: string;
}

export interface SessionUser {
  id: number;
  cpf: string;
  email: string;
  first_name: string;
  last_name: string;
  groups: string[];
  category: SessionUserCategory | null;
  permissions: string[];
}

export interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (cpf: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
