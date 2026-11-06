import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import { useI18n } from './i18n';

const AuthContext = createContext(null);
const RANK = { user: 0, author: 0, moderator: 0, editor: 1, admin: 2 };

export function AuthProvider({ children }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try { sessionStorage.setItem('lotse-sso-off', '1'); } catch { /* ignore */ }  // no silent re-login after sign-out
  }, []);

  /** Windows sign-in (SSO) through the company web server; returns the user or throws. */
  const ssoLogin = useCallback(async () => {
    const res = await api('/auth/sso');
    try { sessionStorage.removeItem('lotse-sso-off'); } catch { /* ignore */ }
    setToken(res.access_token);
    setUser(res.user);
    if (res.user.language) setLang(res.user.language);
    return res.user;
  }, [setLang]);

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
    user, ready, login, logout, setUser, ssoLogin,
    can: (role) => !!user && RANK[user.role] >= RANK[role],
    /** True when the signed-in person has one of the given permissions (admins have all). */
    has: (...perms) => !!user && (user.role === 'admin' || perms.some((p) => (user.effective_permissions || []).includes(p))),
  }), [user, ready, login, logout, ssoLogin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
