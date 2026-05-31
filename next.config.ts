import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['youtube-dl-exec', 'ffmpeg-static'],
  outputFileTracingIncludes: {
    '/api/info': [
      './node_modules/youtube-dl-exec/bin/**',
    ],
    '/api/download': [
      './node_modules/youtube-dl-exec/bin/**',
      './node_modules/ffmpeg-static/**',
    ],
  },
}

export default nextConfig
