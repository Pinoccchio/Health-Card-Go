/**
 * Mock User Database
 *
 * Pre-defined users for testing the authentication system.
 * In production, this will be replaced with Supabase database queries.
 */

import { User } from '@/types/auth';

export interface MockUserCredentials {
  email: string;
  password: string;
}

/**
 * Mock user database with test accounts for all roles
 */
export const MOCK_USERS: (User & { password: string })[] = [
  // Super Admin
  {
    id: '1',
    email: 'admin@healthcard.com',
    password: 'admin123',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    role_id: 1,
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  },

  // Healthcare Admins (5 categories)
  {
    id: '2',
    email: 'healthcard.admin@healthcard.com',
    password: 'healthcard123',
    first_name: 'Maria',
    last_name: 'Santos',
    role_id: 2,
    admin_category: 'healthcard',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '3',
    email: 'hiv.admin@healthcard.com',
    password: 'hiv123',
    first_name: 'Pedro',
    last_name: 'Reyes',
    role_id: 2,
    admin_category: 'hiv',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '4',
    email: 'pregnancy.admin@healthcard.com',
    password: 'pregnancy123',
    first_name: 'Ana',
    last_name: 'Garcia',
    role_id: 2,
    admin_category: 'pregnancy',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '5',
    email: 'general.admin@healthcard.com',
    password: 'general123',
    first_name: 'Carlos',
    last_name: 'Ramos',
    role_id: 2,
    admin_category: 'general_admin',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '6',
    email: 'lab.admin@healthcard.com',
    password: 'lab123',
    first_name: 'Rosa',
    last_name: 'Fernandez',
    role_id: 2,
    admin_category: 'laboratory',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
  },

  // Patients
  {
    id: '9',
    email: 'patient@healthcard.com',
    password: 'patient123',
    first_name: 'Miguel',
    last_name: 'Torres',
    role_id: 4,
    status: 'active',
    barangay_id: 1,
    barangay_name: 'Datu Abdul Dadia',
    contact_number: '+63 912 345 6789',
    date_of_birth: '1990-05-15',
    gender: 'male',
    emergency_contact: {
      name: 'Sofia Torres',
      phone: '+63 912 345 6780',
      email: 'sofia.torres@email.com',
    },
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '10',
    email: 'patient2@healthcard.com',
    password: 'patient123',
    first_name: 'Isabella',
    last_name: 'Lopez',
    role_id: 4,
    status: 'pending',
    barangay_id: 2,
    barangay_name: 'Gredu (Poblacion)',
    contact_number: '+63 918 765 4321',
    date_of_birth: '1995-08-20',
    gender: 'female',
    emergency_contact: {
      name: 'Ricardo Lopez',
      phone: '+63 918 765 4320',
    },
    created_at: '2025-01-15T00:00:00Z',
  },
];

/**
 * Find user by email and password
 */
export const findUserByCredentials = (
  email: string,
  password: string
): User | null => {
  const user = MOCK_USERS.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) return null;

  // Remove password from returned user object
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Find user by email
 */
export const findUserByEmail = (email: string): boolean => {
  return MOCK_USERS.some((u) => u.email === email);
};

/**
 * Find user by ID
 */
export const findUserById = (id: string): User | null => {
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) return null;

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Generate a unique user ID (for new registrations)
 */
export const generateUserId = (): string => {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a mock auth token
 */
export const generateMockToken = (userId: string): string => {
  return `mock-token-${userId}-${Date.now()}`;
};
