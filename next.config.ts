import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheStartUrl: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  fallbacks: {
    document: '/~offline',
  },
  workboxOptions: {
    disableDevLogs: true,
  },
})

const nextConfig: NextConfig = {
  devIndicators: false,
}

export default withPWA(nextConfig)
