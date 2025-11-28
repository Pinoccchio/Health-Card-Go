/**
 * Mock Authentication Service
 *
 * Simulates authentication API calls with mock data.
 * In production, this will be replaced with Supabase Auth API calls.
 */

import {
  User,
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResponse,
  MockSession,
} from '@/types/auth';
import {
  findUserByCredentials,
  findUserByEmail,
  generateUserId,
  generateMockToken,
  MOCK_USERS,
} from './mockUsers';

// Simulate API delay
const simulateDelay = (ms: number = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Session storage key
const SESSION_STORAGE_KEY = 'healthcard_mock_session';

/**
 * Mock Login
 */
export const mockLogin = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  await simulateDelay(800);

  const { email, password } = credentials;

  // Validate inputs
  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required',
    };
  }

  // Find user
  const user = findUserByCredentials(email, password);

  if (!user) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  // Check if user is active (except pending patients)
  if (user.role_id !== 4 && user.status !== 'active') {
    return {
      success: false,
      error: 'Your account has been deactivated. Please contact support.',
    };
  }

  // Generate token
  const token = generateMockToken(user.id);

  // Create session
  const session: MockSession = {
    user,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  };

  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  return {
    success: true,
    user,
    token,
    message: 'Login successful',
  };
};

/**
 * Mock Register
 */
export const mockRegister = async (
  data: RegisterData
): Promise<AuthResponse> => {
  await simulateDelay(1200);

  const { email, password, confirmPassword, first_name, last_name, role_id } =
    data;

  // Validate inputs
  if (!email || !password || !first_name || !last_name) {
    return {
      success: false,
      error: 'Please fill in all required fields',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match',
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters',
    };
  }

  // Check if email already exists
  if (findUserByEmail(email)) {
    return {
      success: false,
      error: 'An account with this email already exists',
    };
  }

  // Validate role-specific fields
  if (role_id === 2 && !data.admin_category) {
    return {
      success: false,
      error: 'Please select an admin category',
    };
  }

  if (role_id === 4 && !data.barangay_id) {
    return {
      success: false,
      error: 'Please select your barangay',
    };
  }

  if (role_id === 3 && (!data.specialization || !data.license_number)) {
    return {
      success: false,
      error: 'Please provide your specialization and license number',
    };
  }

  // Create new user
  const newUser: User = {
    id: generateUserId(),
    email,
    first_name,
    last_name,
    role_id,
    admin_category: data.admin_category,
    status: role_id === 4 ? 'pending' : 'active', // Patients require approval
    barangay_id: data.barangay_id,
    contact_number: data.contact_number,
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    specialization: data.specialization,
    license_number: data.license_number,
    emergency_contact: data.emergency_contact,
    created_at: new Date().toISOString(),
  };

  // Add to mock database (in-memory only)
  MOCK_USERS.push({ ...newUser, password } as any);

  // For patients, don't log them in immediately (pending approval)
  if (role_id === 4) {
    return {
      success: true,
      message:
        'Registration successful! Your account is pending approval. You will be notified once approved.',
    };
  }

  // For other roles, generate token and create session
  const token = generateMockToken(newUser.id);

  const session: MockSession = {
    user: newUser,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  return {
    success: true,
    user: newUser,
    token,
    message: 'Registration successful!',
  };
};

/**
 * Mock Logout
 */
export const mockLogout = async (): Promise<void> => {
  await simulateDelay(300);

  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

/**
 * Mock Forgot Password
 */
export const mockForgotPassword = async (
  data: ForgotPasswordData
): Promise<AuthResponse> => {
  await simulateDelay(800);

  const { email } = data;

  if (!email) {
    return {
      success: false,
      error: 'Please provide your email address',
    };
  }

  // Check if email exists
  if (!findUserByEmail(email)) {
    // For security, don't reveal if email exists or not
    return {
      success: true,
      message:
        'If an account with this email exists, you will receive a password reset link.',
    };
  }

  return {
    success: true,
    message:
      'Password reset link has been sent to your email. Please check your inbox.',
  };
};

/**
 * Mock Reset Password
 */
export const mockResetPassword = async (
  data: ResetPasswordData
): Promise<AuthResponse> => {
  await simulateDelay(800);

  const { password, confirmPassword, token } = data;

  if (!password || !confirmPassword) {
    return {
      success: false,
      error: 'Please fill in all fields',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match',
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters',
    };
  }

  if (!token) {
    return {
      success: false,
      error: 'Invalid or expired reset token',
    };
  }

  return {
    success: true,
    message: 'Password reset successful! You can now log in with your new password.',
  };
};

/**
 * Get current session from localStorage
 */
export const getMockSession = (): MockSession | null => {
  if (typeof window === 'undefined') return null;

  const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionData) return null;

  try {
    const session: MockSession = JSON.parse(sessionData);

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch (error) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getMockSession() !== null;
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  const session = getMockSession();
  return session?.user || null;
};
