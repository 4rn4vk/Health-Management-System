import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { authApi } from "@/api";

interface JwtPayload {
  sub: string;
  role: string;
  type: string;
  exp: number;
}

interface AuthState {
  userId: number | null;
  role: "admin" | "viewer" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const applyToken = useCallback((accessToken: string) => {
    window.__accessToken = accessToken;
    const payload = jwtDecode<JwtPayload>(accessToken);
    setState({
      userId: Number(payload.sub),
      role: payload.role as "admin" | "viewer",
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  // Attempt silent refresh from stored refresh token on mount
  useEffect(() => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    authApi
      .refresh(refresh)
      .then((tokens) => {
        localStorage.setItem("refresh_token", tokens.refresh_token);
        applyToken(tokens.access_token);
      })
      .catch(() => {
        localStorage.removeItem("refresh_token");
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, [applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login(email, password);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      applyToken(tokens.access_token);
    },
    [applyToken]
  );

  const logout = useCallback(() => {
    window.__accessToken = undefined;
    localStorage.removeItem("refresh_token");
    setState({ userId: null, role: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
