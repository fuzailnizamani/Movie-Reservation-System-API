import { createContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi';

export const AuthContext = createContext(null);

const readUser = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [user, setUser] = useState(() => readUser(localStorage.getItem('accessToken') || ''));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const expire = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', expire);
    return () => window.removeEventListener('auth:expired', expire);
  }, []);

  const saveSession = (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(readUser(data.accessToken));
  };

  const signIn = async (credentials) => saveSession(await authApi.login(credentials));
  const signUp = (details) => authApi.register(details);
  const signOut = async () => {
    try {
      if (accessToken) await authApi.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, hydrated, isAuthenticated: Boolean(accessToken), isAdmin: user?.role === 'admin', signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
