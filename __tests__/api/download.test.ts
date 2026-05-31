import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ytdlp', () => ({
  getDirectUrl: vi.fn(),
}))

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=abc'
const TIKTOK_URL = 'https://www.tiktok.com/@user/video/123'

async function callGet(url?: string, format?: string) {
  const { GET } = await import('@/app/api/download/route')
  const params = new URLSearchParams()
  if (url) params.set('url', url)
  if (format) params.set('format', format)
  return GET(new NextRequest(`http://localhost/api/download?${params}`))
}

describe('GET /api/download', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 400 when url is missing', async () => {
    const res = await callGet(undefined, 'mp4_720')
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid format', async () => {
    const res = await callGet(YOUTUBE_URL, 'webm')
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed domain', async () => {
    const res = await callGet('https://evil.com/video', 'mp4_720')
    expect(res.status).toBe(400)
  })

  it('returns cobaltUrl for YouTube (blocked on server)', async () => {
    const res = await callGet(YOUTUBE_URL, 'mp4_720')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cobaltUrl).toContain('cobalt.tools')
    expect(body.cobaltUrl).toContain(encodeURIComponent(YOUTUBE_URL))
  })

  it('returns redirectUrl for TikTok mp4_720', async () => {
    const { getDirectUrl } = await import('@/lib/ytdlp')
    vi.mocked(getDirectUrl).mockResolvedValue('https://cdn.tiktok.com/video.mp4')
    const res = await callGet(TIKTOK_URL, 'mp4_720')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.redirectUrl).toBe('https://cdn.tiktok.com/video.mp4')
  })

  it('returns 500 when getDirectUrl throws for TikTok', async () => {
    const { getDirectUrl } = await import('@/lib/ytdlp')
    vi.mocked(getDirectUrl).mockRejectedValue(new Error('Not found'))
    const res = await callGet(TIKTOK_URL, 'mp4_720')
    expect(res.status).toBe(500)
  })
})
