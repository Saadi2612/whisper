import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('whisper_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userInfo = await apiService.getCurrentUser();
          setUser(userInfo.user);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('whisper_token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const result = await apiService.login(email, password);
      
      if (result.status === 'success') {
        setUser(result.user);
        setToken(result.token);
        localStorage.setItem('whisper_token', result.token);
        toast.success(`Welcome back, ${result.user.name}!`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const result = await apiService.register(email, password, name);
      
      if (result.status === 'success') {
        setUser(result.user);
        setToken(result.token);
        localStorage.setItem('whisper_token', result.token);
        toast.success(`Welcome to Whisper, ${result.user.name}!`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // Call logout API to blacklist the token
      await apiService.logout();
    } catch (error) {
      // Don't show error to user, just log it
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API call result
      setUser(null);
      setToken(null);
      localStorage.removeItem('whisper_token');
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};