import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  staleTimes: {
    dynamic: 0,
  },
}

export default nextConfig
