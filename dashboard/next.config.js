/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
      }
    }
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ["@coral-xyz/anchor"],
  },
}

module.exports = nextConfig
