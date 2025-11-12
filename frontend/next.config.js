/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{
      hostname: "implementation-scorecard.com"
    }],
  },
  
  async rewrites() {
    const isDev = process.env.NODE_ENV === 'development';
    
    console.log('🔧 Rewrites function called!');
    console.log('Environment:', process.env.NODE_ENV);
    
    return [
      {
        source: '/api/:path*',
        destination: isDev 
        ? 'http://localhost:8000/api/:path*'
        : 'https://bioradar-implementation-scorecard.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;