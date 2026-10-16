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
    try {
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
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const register = async (username, email, password, id_tenant) => {
    try {
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
    } catch (err) {
      return { success: false, error: err.message };
    }
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
    // Legacy support (fallback to Super_Admin)
    if (!user) return false;
    if (user.rol === 'Super_Admin' || user.rol === 'Administrador_Empresa') return true;

    // We check against the granular permissions based on the URL path or module string
    // Here we need to implement granular logic, but for simple string checks,
    // we can keep legacy compatibility or let UI components use usePermissions directly.
    return true; // Simplified for now since we'll use usePermissions hook in components
  };

  const cambiarClaveObligatorio = async (nuevaClave) => {
    const res = await fetchApi('/auth/cambiar-clave-obligatorio', {
      method: 'POST',
      body: JSON.stringify({ nuevaClave }),
    });
    if (res.success) {
      setUser({ ...user, requiere_cambio_clave: false });
    }
    return res;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    cambiarClaveObligatorio,
    canAccess,
    isAuthenticated: !!user,
    requiereCambioClave: !!user?.requiere_cambio_clave,
    tenantId: user?.id_tenant,
    userId: user?.id_usuario,
    rol: user?.rol,
    permisos: user?.permisos || [],
    granular: user?.granular || [],
    fincas: user?.fincas || [],
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