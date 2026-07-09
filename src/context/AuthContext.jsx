import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetchApi('/auth/me');
      if (res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username, password) => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const register = async (username, email, password, id_tenant) => {
    const res = await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, id_tenant }),
    });
    if (res.token) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await fetchApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res;
  };

  const canAccess = (modulo, accion = 'leer') => {
    if (!user || !user.permisos) return false;
    const permiso = user.permisos.find(p => p.modulo === modulo || p.modulo === 'Todos');
    if (!permiso) return false;
    const map = { leer: 'puede_leer', escribir: 'puede_escribir', eliminar: 'puede_eliminar', exportar: 'puede_exportar' };
    return permiso[map[accion]] === 1;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    canAccess,
    isAuthenticated: !!user,
    tenantId: user?.id_tenant,
    userId: user?.id_usuario,
    rol: user?.rol,
    permisos: user?.permisos || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}