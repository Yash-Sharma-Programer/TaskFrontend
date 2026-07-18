import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, organisationsApi } from '../api';
import { setAccessToken } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const AuthContext = createContext(null);

// React Strict Mode re-runs effects in development. Sharing the in-flight
// bootstrap prevents two simultaneous refresh-token rotations.
let bootstrapPromise = null;
const bootstrapSession = () => {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const { data } = await authApi.refresh();
      setAccessToken(data.data.accessToken);
      const organisations = (await organisationsApi.list()).data.data.organisations;
      return { user: data.data.user, organisations };
    })().finally(() => {
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
};

export const AuthProvider = ({ children }) => {
  const [ready, setReady] = useState(false); const { user, setAuth, clearAuth, setOrganisations, selectOrganisation, organisation } = useAppStore();
  useEffect(() => {
    let active = true;
    bootstrapSession()
      .then(({ user: sessionUser, organisations }) => {
        if (!active) return;
        setAuth(sessionUser);
        setOrganisations(organisations);
        const stored = localStorage.getItem('taskflow-organisation');
        selectOrganisation(
          organisations.find((item) => item.id === stored) || organisations[0] || null,
        );
      })
      .catch(() => {
        if (!active) return;
        setAccessToken(null);
        clearAuth();
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const login = async (values) => { const { data } = await authApi.login(values); setAccessToken(data.data.accessToken); setAuth(data.data.user); const orgs = (await organisationsApi.list()).data.data.organisations; setOrganisations(orgs); selectOrganisation(orgs[0] || null); return data.data.user; };
  const register = async (values) => { const { data } = await authApi.register(values); setAccessToken(data.data.accessToken); setAuth(data.data.user); return data.data.user; };
  const logout = async () => { try { await authApi.logout(); } finally { setAccessToken(null); clearAuth(); localStorage.removeItem('taskflow-organisation'); } };
  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
