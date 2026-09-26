import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, apiJson } from "../lib/api";
import { AuthContext, type SessionUser } from "./auth-state";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/auth/me/")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setUser(body?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (cpf: string, password: string) => {
    const body = await apiJson<{ user: SessionUser }>("/api/auth/login/", {
      method: "POST",
      json: { cpf, password },
    });
    setUser(body.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout/", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
