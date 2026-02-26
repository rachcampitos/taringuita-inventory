"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, setTokens, clearTokens } from "./api";

export interface Station {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "supervisor" | "operator";
  organizationId: string;
  stations: Station[];
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

function loadUserFromStorage(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

function saveUserToStorage(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from localStorage and verify token
  useEffect(() => {
    const storedUser = loadUserFromStorage();
    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    if (storedUser && accessToken) {
      setUser(storedUser);
      // Optionally verify token is still valid
      api
        .get<User>("/auth/me")
        .then(({ data }) => {
          setUser(data);
          saveUserToStorage(data);
        })
        .catch(() => {
          // Token invalid, will be refreshed by api client or cleared
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    setTokens(data.accessToken, data.refreshToken);
    saveUserToStorage(data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

export { ApiError };
