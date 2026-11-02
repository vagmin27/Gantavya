import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore session on load via HTTP-only cookie
  useEffect(() => {
    AuthService.getMe()
      .then((res) => {
        if (res?.data?.user) {
          setUser(res.data.user);
          setProfile(res.data.profile);
        }
      })
      .catch(() => {
        // Not authenticated or expired session
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await AuthService.login({ email, password });
      setUser(res.data.user);
      // Fetch full profile
      const meRes = await AuthService.getMe();
      setProfile(meRes.data.profile);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const register = async ({ name, email, password }) => {
    setAuthError(null);
    try {
      const res = await AuthService.register({ name, email, password });
      setUser(res.data.user);
      const meRes = await AuthService.getMe();
      setProfile(meRes.data.profile);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const updateProfile = async (data) => {
    const res = await AuthService.updateMe(data);
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        authError,
        login,
        register,
        logout,
        updateProfile
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

