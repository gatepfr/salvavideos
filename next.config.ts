import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['youtube-dl-exec', 'ffmpeg-static'],
}

export default nextConfig
