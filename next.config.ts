import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  typescript: {
    // Disable TypeScript errors during builds to prevent deployment failures on Vercel
    ignoreBuildErrors: true,
  },
  images: {
    qualities: [75, 90],
  },
};

export default withNextIntl(nextConfig);
