import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, remember = false) => {
    // Refresh CSRF cookie if needed
    const response = await axios.post('/api/auth/login', {
      email,
      password,
      remember,
    });

    if (response.data.csrf_token) {
      window.axios.defaults.headers.common['X-CSRF-TOKEN'] = response.data.csrf_token;
    }

    if (response.data.success && response.data.user) {
      setUser(response.data.user);
    }

    return response.data;
  };

  const logout = async () => {
    try {
      const response = await axios.post('/api/auth/logout');
      if (response.data?.csrf_token) {
        window.axios.defaults.headers.common['X-CSRF-TOKEN'] = response.data.csrf_token;
      }
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
