/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{
      hostname: "implementation-scorecard.com"
    }],
  },
  
  // Rewrite API calls to backend
  async rewrites() {
    // In development, proxy to local FastAPI
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    }
    
    // In production on Vercel, API routes are handled by vercel.json
    return [];
  },
};

export default nextConfig;