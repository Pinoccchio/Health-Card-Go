import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { locale } = await request.json();

    // Validate locale
    const validLocales = ['en', 'fil', 'ceb'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json(
        { success: false, error: 'Invalid locale' },
        { status: 400 }
      );
    }

    // Set locale cookie
    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    });

    // Update user's locale in database if authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ locale })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user locale in database:', updateError);
        // Don't fail the request if database update fails - cookie is still set
      }
    }

    return NextResponse.json({
      success: true,
      locale,
    });
  } catch (error) {
    console.error('Error setting locale:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set locale' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  return NextResponse.json({
    success: true,
    locale,
  });
}
