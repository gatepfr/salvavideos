export interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  platform: string
  formats: Array<'mp4_720' | 'mp4_1080' | 'mp3'>
}

interface OEmbedData {
  title: string
  thumbnail_url: string
}

export function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  return 'unknown'
}

function oembedUrl(url: string, platform: string): string {
  const enc = encodeURIComponent(url)
  if (platform === 'youtube') return `https://www.youtube.com/oembed?url=${enc}&format=json`
  if (platform === 'tiktok') return `https://www.tiktok.com/oembed?url=${enc}`
  if (platform === 'instagram') return `https://api.instagram.com/oembed?url=${enc}`
  throw new Error('Plataforma não suportada')
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const platform = detectPlatform(url)
  const endpoint = oembedUrl(url, platform)

  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) throw new Error(`oEmbed ${res.status}`)

  const data: OEmbedData = await res.json()

  return {
    title: data.title,
    thumbnail: data.thumbnail_url,
    duration: 0,
    platform,
    formats: ['mp4_720', 'mp4_1080', 'mp3'],
  }
}
