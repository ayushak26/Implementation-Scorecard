/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{
      hostname: "implementationscorecard.com"
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
        : 'https://bioradarimplementationscorecard.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
