'use client';

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  AuthContextType,
  User,
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/types/auth';
import {
  mockLogin,
  mockRegister,
  mockLogout,
  mockForgotPassword,
  mockResetPassword,
  getCurrentUser,
} from './mockAuthService';

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 *
 * Provides authentication state and methods to all child components.
 * Manages user session, login, logout, and registration.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error checking session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  /**
   * Login function
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockLogin(credentials);

      if (!response.success) {
        setError(response.error || 'Login failed');
        throw new Error(response.error);
      }

      if (response.user) {
        setUser(response.user);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register function
   */
  const register = useCallback(async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockRegister(data);

      if (!response.success) {
        setError(response.error || 'Registration failed');
        throw new Error(response.error);
      }

      // If user is returned (not pending approval), set user
      if (response.user) {
        setUser(response.user);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred during registration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await mockLogout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Forgot password function
   */
  const forgotPassword = useCallback(async (data: ForgotPasswordData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockForgotPassword(data);

      if (!response.success) {
        setError(response.error || 'Failed to send reset email');
        throw new Error(response.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while sending reset email';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset password function
   */
  const resetPassword = useCallback(async (data: ResetPasswordData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mockResetPassword(data);

      if (!response.success) {
        setError(response.error || 'Failed to reset password');
        throw new Error(response.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while resetting password';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error function
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
