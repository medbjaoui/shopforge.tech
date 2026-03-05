/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Développement local
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      // Production API
      { protocol: 'https', hostname: 'api.shopforge.tech', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
