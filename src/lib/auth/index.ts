/**
 * Authentication Library
 *
 * Exports for authentication context, hooks, and mock services
 */

export { AuthProvider, AuthContext } from './AuthContext';
export { useAuth } from './useAuth';
export {
  mockLogin,
  mockRegister,
  mockLogout,
  mockForgotPassword,
  mockResetPassword,
  getMockSession,
  isAuthenticated,
  getCurrentUser,
} from './mockAuthService';
export {
  MOCK_USERS,
  findUserByCredentials,
  findUserByEmail,
  findUserById,
  generateUserId,
  generateMockToken,
} from './mockUsers';
