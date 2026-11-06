import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import { useI18n } from './i18n';

const AuthContext = createContext(null);
const RANK = { user: 0, editor: 1, admin: 2 };

export function AuthProvider({ children }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) {
      setReady(true);
      return;
    }
    api('/auth/me').then(setUser).catch(logout).finally(() => setReady(true));
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const res = await api('/auth/login', { method: 'POST', body: { username, password } });
    setToken(res.access_token);
    setUser(res.user);
    if (res.user.language) setLang(res.user.language);
    return res.user;
  }, [setLang]);

  const value = useMemo(() => ({
    user, ready, login, logout, setUser,
    can: (role) => !!user && RANK[user.role] >= RANK[role],
  }), [user, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
