import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HealthCardGo | Healthcare Appointment Management System",
  description: "Comprehensive Healthcare Appointment Management and Disease Surveillance System for the City Health Office of Panabo City, Davao del Norte, Philippines.",
  keywords: ["healthcare", "appointments", "medical records", "disease surveillance", "Panabo City", "health card"],
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

  return (
    <html lang={locale} className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
