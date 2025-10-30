/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{
      hostname: "implementation-scorecard.com"
    }],
  },
  
  async rewrites() {
    console.log('🔧 Rewrites function called!'); // Add this
    console.log('Environment:', process.env.NODE_ENV); // Add this
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Returning rewrites'); // Add this
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ];
    }
    console.log('❌ Not in development mode'); // Add this
    return [];
  },
};

export default nextConfig;