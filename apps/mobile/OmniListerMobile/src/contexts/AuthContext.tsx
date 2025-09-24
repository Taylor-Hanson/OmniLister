// Authentication Context for Mobile App

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { mockApiService as apiService } from '../services/mockApiService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: { email: string; password: string; name: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (apiService.isAuthenticated()) {
        const response = await apiService.getCurrentUser();
        if (response.data) {
          setUser(response.data);
        } else {
          // Token might be invalid, clear it
          await apiService.logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      
      if (response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);
      
      if (response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
