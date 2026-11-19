/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bioradarimplementationscorecard.com',
      },
      {
        protocol: 'https',
        hostname: 'implementationscorecard.com',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.BACKEND_URL
            ? `${process.env.BACKEND_URL}/api/:path*`
            : 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
