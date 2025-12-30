import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default getRequestConfig(async () => {
  // Get locale from cookie or default to English
  const cookieStore = await cookies();
  let locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  // Force English for non-patient roles (admin/staff use English only)
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', user.id)
        .single();

      // Force English for: super_admin (1), healthcare_admin (2), staff (5)
      // Only patients (role_id: 4) can use other languages
      if (profile && profile.role_id !== 4) {
        locale = 'en';
      }
    }
  } catch (error) {
    // If profile check fails, default to English for safety
    console.error('Failed to check user role for locale:', error);
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
