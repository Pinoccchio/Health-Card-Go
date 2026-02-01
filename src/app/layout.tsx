import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { RootProviders } from "@/components/providers/RootProviders";
import { createServerClient } from "@supabase/ssr";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HealthCardGo | Healthcare Appointment Management System",
  description: "Comprehensive Healthcare Appointment Management and Disease Surveillance System for the City Health Office of Panabo City, Davao del Norte, Philippines.",
  keywords: ["healthcare", "appointments", "disease surveillance", "Panabo City", "health card"],
  authors: [{ name: "HealthCardGo Team" }],
  openGraph: {
    title: "HealthCardGo | Healthcare Management",
    description: "Providing exceptional patient experiences with compassionate care and state-of-the-art facilities.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale from cookie
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  // Create server-side Supabase client to validate session
  // This ensures the session is checked server-side before rendering
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // No-op in layout - cookies are set by middleware
        },
      },
    }
  );

  // SECURITY FIX: Use getUser() instead of getSession()
  // getUser() validates the session server-side, while getSession() only reads cookies (insecure)
  // This prevents the warning: "Using the user object as returned from supabase.auth.getSession() ... could be insecure!"
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang={locale} className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <RootProviders initialUser={user}>{children}</RootProviders>
      </body>
    </html>
  );
}
