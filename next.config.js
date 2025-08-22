/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude cloudinary from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
      
      config.externals = config.externals || []
      config.externals.push({
        cloudinary: 'cloudinary'
      })
    }
    
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['cloudinary']
  }
}

module.exports = nextConfig