import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
