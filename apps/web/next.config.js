function envOr(key, fallback) {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@clcrm/api', '@clcrm/types', '@clcrm/ui', '@clcrm/validators', '@yuletide/firebase'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: envOr(
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'AIzaSyD9jk7wARDfxpaYxigLKTJ13gK7eCBhCEY',
    ),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: envOr(
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'yuletide-lighting.firebaseapp.com',
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: envOr('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'yuletide-lighting'),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: envOr(
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'yuletide-lighting.firebasestorage.app',
    ),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: envOr(
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      '928287362183',
    ),
    NEXT_PUBLIC_FIREBASE_APP_ID: envOr(
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      '1:928287362183:web:e0cca4d6e2f6d89cc3bc22',
    ),
    NEXT_PUBLIC_APP_URL: envOr('NEXT_PUBLIC_APP_URL', 'https://yuletide-lighting.web.app'),
    NEXT_PUBLIC_TINA_CLIENT_ID: envOr(
      'NEXT_PUBLIC_TINA_CLIENT_ID',
      'b17e495a-4dd4-4314-b4c8-7e816567433b',
    ),
    NEXT_PUBLIC_TINA_BRANCH: envOr('NEXT_PUBLIC_TINA_BRANCH', 'main'),
    NEXT_PUBLIC_MAPBOX_TOKEN: envOr('NEXT_PUBLIC_MAPBOX_TOKEN', ''),
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
