'use client';

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  AuthContextType,
  User,
  LoginCredentials,
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/types/auth';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
  initialUser?: SupabaseUser | null; // Validated user from server-side getUser()
}

/**
 * AuthProvider Component
 *
 * Provides authentication state and methods to all child components.
 * Uses Supabase Auth for authentication and profile management.
 * Accepts initialUser from server-side to sync state immediately (validated via getUser()).
 */
export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []); // Memoized - stable reference

  /**
   * Convert Supabase profile to User type
   */
  const profileToUser = (profile: Profile): User => {
    // Map database enums to application types
    const roleMap = {
      super_admin: 1,
      healthcare_admin: 2,
      patient: 4,
      staff: 5,
      education_admin: 6,
    } as const;

    return {
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role_id: roleMap[profile.role] || 4,
      admin_category: profile.admin_category as any,
      assigned_service_id: profile.assigned_service_id || undefined,
      status: profile.status as any,
      barangay_id: profile.barangay_id || undefined,
      contact_number: profile.contact_number || undefined,
      date_of_birth: profile.date_of_birth || undefined,
      gender: profile.gender as any,
      specialization: profile.specialization || undefined,
      license_number: profile.license_number || undefined,
      emergency_contact: profile.emergency_contact as any,
      approved_at: profile.approved_at || undefined,
      approved_by: profile.approved_by || undefined,
      rejection_reason: profile.rejection_reason || undefined,
      created_at: profile.created_at,
    };
  };

  /**
   * Fetch user profile from database with retry logic
   */
  const fetchUserProfile = useCallback(
    async (authUser: SupabaseUser, retryCount = 0): Promise<User | null> => {
      const maxRetries = 3;
      const retryDelays = [100, 300, 500]; // milliseconds

      try {
        console.log(`🔍 [FETCH PROFILE] Attempt ${retryCount + 1}/${maxRetries + 1} - Fetching profile for user:`, authUser.id);

        // SECURITY FIX: Removed getSession() call - we already have validated user from getUser()
        // No need to re-check session here as authUser is already validated

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('❌ [FETCH PROFILE] Error fetching profile:', error);
          console.error('❌ [FETCH PROFILE] Full error object:', JSON.stringify(error, null, 2));
          console.error('❌ [FETCH PROFILE] Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });

          // PGRST116 = "Cannot coerce the result to a single JSON object" (0 rows)
          // This means profile doesn't exist - don't retry, just sign out
          if (error.code === 'PGRST116') {
            console.warn('⚠️ [FETCH PROFILE] Profile not found (orphaned auth user or deleted)');
            console.log('🔐 [FETCH PROFILE] Signing out to clear stale session...');
            await supabase.auth.signOut();
            return null;
          }

          // Retry logic for timing/commit issues (non-PGRST116 errors)
          if (retryCount < maxRetries) {
            const delay = retryDelays[retryCount];
            console.log(`⏳ [FETCH PROFILE] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchUserProfile(authUser, retryCount + 1);
          }

          console.error('❌ [FETCH PROFILE] All retry attempts failed');
          return null;
        }

        if (!profile) {
          console.error('❌ [FETCH PROFILE] No profile found for user:', authUser.id);
          return null;
        }

        console.log('✅ [FETCH PROFILE] Profile fetched successfully:', profile.id);
        return profileToUser(profile);
      } catch (err) {
        console.error('❌ [FETCH PROFILE] Unexpected error:', err);
        return null;
      }
    },
    [] // Empty deps - stable reference, supabase is memoized and accessed from closure
  );

  /**
   * Check for existing session on mount (JobSync pattern)
   * No auth state listener - login/logout methods update context directly
   * If initialUser is provided from server (validated via getUser()), use it immediately
   */
  useEffect(() => {
    // If we have initial user from server (already validated via getUser()), use it immediately
    if (initialUser) {
      console.log('🚀 [AUTH CONTEXT] Using initial user from server (validated)');
      fetchUserProfile(initialUser).then((profile) => {
        setUser(profile);
        setLoading(false);
      });
    } else {
      // One-time user check on mount (client-only)
      // SECURITY FIX: Use getUser() instead of getSession() for validation
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          fetchUserProfile(authUser).then((profile) => {
            setUser(profile);
            setLoading(false);
          });
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    }

    // No onAuthStateChange listener!
    // Login/register/logout functions update state directly
  }, [initialUser]); // Depend on initialUser to re-run if it changes

  /**
   * Login function
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (authError) {
          setError(authError.message);
          throw new Error(authError.message);
        }

        if (data.user) {
          const profile = await fetchUserProfile(data.user);
          if (!profile) {
            throw new Error('Failed to load user profile. Please try logging in again.');
          }

          // Validate user status - only active users can log in
          if (profile.status !== 'active') {
            // Sign out the user immediately
            await supabase.auth.signOut();

            // Provide specific error messages based on status
            let errorMessage = 'Unable to log in';
            switch (profile.status) {
              case 'pending':
                errorMessage = 'Your account is pending approval. Please wait for an administrator to approve your registration.';
                break;
              case 'rejected':
                errorMessage = 'Your account has been rejected. Please contact support for more information.';
                break;
              case 'inactive':
                errorMessage = 'Your account is inactive. Please contact support to reactivate your account.';
                break;
              case 'suspended':
                errorMessage = 'Your account has been suspended. Please contact support for assistance.';
                break;
              default:
                errorMessage = 'Your account status does not allow login. Please contact support.';
            }
            setError(errorMessage);
            throw new Error(errorMessage);
          }

          // SECURITY: Validate service assignment for healthcare admins
          // Healthcare admins MUST be assigned to a service to access appointments/patients
          if (profile.role_id === 2 && !profile.assigned_service_id) {
            // Sign out the user immediately
            await supabase.auth.signOut();

            const errorMessage =
              'Your account has not been assigned to a service yet. ' +
              'Please contact a Super Admin to assign your account to a service before you can access the healthcare admin dashboard.';
            setError(errorMessage);
            throw new Error(errorMessage);
          }

          setUser(profile);
          return profile; // Return user data immediately for redirect
        }

        throw new Error('No user data returned from authentication');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred during login';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchUserProfile] // Fixed: removed supabase from deps (memoized in closure)
  );

  /**
   * Register function
   */
  const register = useCallback(
    async (data: RegisterData) => {
      try {
        console.log('🔐 [AUTH CONTEXT] Register function called');
        console.log('🔐 [AUTH CONTEXT] Registration data:', {
          email: data.email,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          adminCategory: data.adminCategory,
        });

        setLoading(true);
        setError(null);

        // DUPLICATE PREVENTION: Check for existing patient BEFORE creating auth user
        // This prevents orphaned auth users if duplicate is detected
        if (data.role === 'patient' && data.dateOfBirth) {
          console.log('🔍 [AUTH CONTEXT] Checking for duplicate patient before auth user creation...');

          // Use database function for duplicate check
          // This ensures check matches database constraint EXACTLY
          const { data: existingProfiles, error: duplicateCheckError } = await supabase
            .rpc('check_duplicate_patient', {
              p_first_name: data.firstName,  // Function handles trimming
              p_last_name: data.lastName,     // Function handles trimming
              p_date_of_birth: data.dateOfBirth
            });

          if (duplicateCheckError) {
            console.error('❌ [AUTH CONTEXT] Error checking for duplicates:', duplicateCheckError);

            // FAIL CLOSED: If duplicate check fails, abort registration for safety
            const errorMessage = 'Unable to verify registration. Please try again or contact support if the problem persists.';
            setError(errorMessage);
            throw new Error(errorMessage);
          }

          if (existingProfiles && existingProfiles.length > 0) {
            console.error('❌ [AUTH CONTEXT] Duplicate patient found BEFORE auth creation:', {
              firstName: data.firstName,
              lastName: data.lastName,
              dateOfBirth: data.dateOfBirth,
              existingEmails: existingProfiles.map(p => p.email),
            });

            // Mask email for privacy: show first char and domain
            const maskEmail = (email: string) => {
              const [localPart, domain] = email.split('@');
              return `${localPart[0]}***@${domain}`;
            };

            const maskedEmail = existingProfiles[0]?.email ? maskEmail(existingProfiles[0].email) : '';
            const errorMessage = `A patient named "${data.firstName} ${data.lastName}" born on ${data.dateOfBirth} already exists in the system${maskedEmail ? ` (${maskedEmail})` : ''}. If this is you, please use the login page or contact support for assistance.`;
            setError(errorMessage);
            throw new Error(errorMessage);
          }

          console.log('✅ [AUTH CONTEXT] No duplicate found, proceeding with auth user creation');
        }

        console.log('🔐 [AUTH CONTEXT] Calling Supabase signUp...');
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
            },
          },
        });

        console.log('🔐 [AUTH CONTEXT] Supabase signUp response:', {
          user: authData?.user?.id,
          session: authData?.session?.access_token ? 'present' : 'missing',
          error: authError,
        });

        if (authError) {
          console.error('❌ [AUTH CONTEXT] Supabase signUp error:', authError);
          setError(authError.message);
          throw new Error(authError.message);
        }

        if (!authData.user) {
          console.error('❌ [AUTH CONTEXT] No user returned from signUp');
          throw new Error('Failed to create user');
        }

        console.log('✅ [AUTH CONTEXT] User created with ID:', authData.user.id);

        // Determine role
        const roleMap: Record<string, Database['public']['Enums']['user_role']> = {
          patient: 'patient',
          healthcare_admin: 'healthcare_admin',
          super_admin: 'super_admin',
          staff: 'staff',
        };

        const role = roleMap[data.role] || 'patient';
        console.log('🔐 [AUTH CONTEXT] Mapped role:', data.role, '→', role);

        // Log session state after signup (for debugging)
        console.log('🔍 [AUTH CONTEXT] Checking session after signup...');
        console.log('🔍 [AUTH CONTEXT] authData.session:', authData.session ? 'present' : 'null');
        console.log('🔍 [AUTH CONTEXT] authData.user:', authData.user ? authData.user.id : 'null');

        // Profile is auto-created by database trigger with basic info
        // We UPDATE it here with role-specific fields
        console.log('🔐 [AUTH CONTEXT] Waiting 500ms for trigger to create profile...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // NOTE: Duplicate check now happens BEFORE auth user creation (lines 270-317)
        // This prevents orphaned auth users if duplicate is detected

        // Create patient record FIRST if role is patient (before setting status to 'active')
        // This ensures patient record exists before any triggers fire on status change
        if (role === 'patient') {
          console.log('🔐 [AUTH CONTEXT] Creating patient record...');

          // Generate patient number using database function (atomic, thread-safe)
          const { data: patientNumberData, error: patientNumberError } = await supabase
            .rpc('generate_patient_number');

          if (patientNumberError || !patientNumberData) {
            console.error('❌ [AUTH CONTEXT] Failed to generate patient number:', patientNumberError);
            throw new Error('Failed to generate patient number');
          }

          const patientNumber = patientNumberData;
          console.log('🔐 [AUTH CONTEXT] Generated patient number:', patientNumber);

          const { error: patientError } = await supabase
            .from('patients')
            .insert({
              user_id: authData.user.id,
              patient_number: patientNumber,
              allergies: data.allergies ? [data.allergies] : null,
              current_medications: null,
              medical_history: {
                blood_type: data.bloodType || null,
                conditions: data.medicalConditions || null,
                registration_date: new Date().toISOString(),
              },
            });

          if (patientError) {
            console.error('❌ [AUTH CONTEXT] Patient record creation error:', patientError);
            console.error('⚠️ [AUTH CONTEXT] Profile created but patient record failed - manual cleanup may be needed');
            setError('Failed to create patient record: ' + patientError.message);
            throw new Error('Failed to create patient record: ' + patientError.message);
          }

          console.log('✅ [AUTH CONTEXT] Patient record created successfully');
        }

        // Now update profile with role-specific fields and set status to 'active'
        const profileUpdateData = {
          role,
          admin_category: (data.adminCategory ?? null) as any,
          status: 'active', // Auto-approve all users (patients get immediate access)
          approved_at: new Date().toISOString(), // Set approval timestamp
          barangay_id: data.barangayId ?? null,
          contact_number: data.contactNumber ?? null,
          date_of_birth: data.dateOfBirth ?? null,
          gender: (data.gender ?? null) as any,
          specialization: data.specialization ?? null,
          license_number: data.licenseNumber ?? null,
          emergency_contact: (data.emergencyContact ?? null) as any,
        };

        console.log('🔐 [AUTH CONTEXT] Updating profile with role-specific data:', profileUpdateData);

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('❌ [AUTH CONTEXT] Profile update error:', profileError);
          console.error('❌ [AUTH CONTEXT] Full profile error object:', JSON.stringify(profileError, null, 2));
          console.error('❌ [AUTH CONTEXT] Profile error details:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code,
          });

          // NOTE: Cannot delete auth user from client-side (requires admin privileges)
          // The auth user will remain in auth.users without a profile
          // User can try registering again, or admin must manually clean up via Supabase dashboard
          console.error('⚠️ [AUTH CONTEXT] Auth user created but profile failed - manual cleanup may be needed');
          console.error('⚠️ [AUTH CONTEXT] User ID for cleanup:', authData.user.id);

          // Translate database error codes to user-friendly messages
          let userFriendlyMessage = profileError.message;

          if (profileError.code === '23505') {
            // PostgreSQL unique constraint violation
            if (profileError.message.includes('idx_patient_duplicate_prevention')) {
              userFriendlyMessage =
                `A patient with this name and date of birth already exists in the system. ` +
                `If this is you, please use the login page to sign in. ` +
                `If you believe this is an error, please contact support for assistance.`;
            } else if (profileError.message.includes('profiles_email_key') || profileError.message.includes('email')) {
              userFriendlyMessage =
                `This email address is already registered. ` +
                `Please use the login page to sign in or use a different email address.`;
            } else {
              // Generic duplicate error
              userFriendlyMessage =
                `This information is already registered in the system. ` +
                `Please check your details or contact support for assistance.`;
            }
          }

          setError(userFriendlyMessage);
          throw new Error(userFriendlyMessage);
        }

        console.log('✅ [AUTH CONTEXT] Profile updated successfully');

        // Wait to ensure database transaction is committed (matches JobSync pattern)
        console.log('⏳ [AUTH CONTEXT] Waiting 1000ms for database commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sign out user to require explicit login after registration
        console.log('🔐 [AUTH CONTEXT] Signing out user - explicit login required');
        await supabase.auth.signOut();

        console.log('✅ [AUTH CONTEXT] Registration complete - user must login explicitly');
        console.log('✅ [AUTH CONTEXT] User account created successfully, redirecting to login page');

        // Do NOT fetch/set user profile - user must login explicitly
        // This prevents auto-login and requires users to authenticate after registration
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
    },
    [fetchUserProfile] // Fixed: removed supabase from deps (memoized in closure)
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Fixed: removed supabase from deps (memoized in closure)

  /**
   * Forgot password function
   */
  const forgotPassword = useCallback(
    async (data: ForgotPasswordData) => {
      try {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          setError(error.message);
          throw new Error(error.message);
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
    },
    [] // Fixed: removed supabase from deps (memoized in closure)
  );

  /**
   * Reset password function
   */
  const resetPassword = useCallback(
    async (data: ResetPasswordData) => {
      try {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (error) {
          setError(error.message);
          throw new Error(error.message);
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
    },
    [] // Fixed: removed supabase from deps (memoized in closure)
  );

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
