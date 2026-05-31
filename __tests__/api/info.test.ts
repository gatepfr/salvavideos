import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ytdlp', () => ({
  getVideoInfo: vi.fn(),
}))

const VALID_URL = 'https://www.youtube.com/watch?v=abc'

async function callGet(url?: string) {
  const { GET } = await import('@/app/api/info/route')
  const reqUrl = url
    ? `http://localhost/api/info?url=${encodeURIComponent(url)}`
    : 'http://localhost/api/info'
  return GET(new NextRequest(reqUrl))
}

describe('GET /api/info', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 400 when url param is missing', async () => {
    const res = await callGet()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 400 for disallowed domain', async () => {
    const res = await callGet('https://evil.com/video')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/URL válida/i)
  })

  it('returns 200 with video info on success', async () => {
    const { getVideoInfo } = await import('@/lib/ytdlp')
    vi.mocked(getVideoInfo).mockResolvedValue({
      title: 'My Video',
      thumbnail: 'https://img.jpg',
      duration: 60,
      platform: 'youtube',
      formats: ['mp4_720', 'mp4_1080', 'mp3'],
    })
    const res = await callGet(VALID_URL)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('My Video')
    expect(body.platform).toBe('youtube')
  })

  it('returns 504 on TIMEOUT error', async () => {
    const { getVideoInfo } = await import('@/lib/ytdlp')
    vi.mocked(getVideoInfo).mockRejectedValue(new Error('TIMEOUT'))
    const res = await callGet(VALID_URL)
    expect(res.status).toBe(504)
    const body = await res.json()
    expect(body.error).toMatch(/demorou/i)
  })

  it('returns 500 on generic error', async () => {
    const { getVideoInfo } = await import('@/lib/ytdlp')
    vi.mocked(getVideoInfo).mockRejectedValue(new Error('Something broke'))
    const res = await callGet(VALID_URL)
    expect(res.status).toBe(500)
  })
})
