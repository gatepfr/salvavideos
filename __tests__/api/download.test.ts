import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ytdlp', () => ({
  getDirectUrl: vi.fn(),
  getAudioTempFile: vi.fn(),
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual,
    stat: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    createReadStream: vi.fn(),
  }
})

const VALID_URL = 'https://www.youtube.com/watch?v=abc'

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
    const res = await callGet(VALID_URL, 'webm')
    expect(res.status).toBe(400)
  })

  it('returns 400 for disallowed domain', async () => {
    const res = await callGet('https://evil.com/video', 'mp4_720')
    expect(res.status).toBe(400)
  })

  it('returns redirectUrl for mp4_720', async () => {
    const { getDirectUrl } = await import('@/lib/ytdlp')
    vi.mocked(getDirectUrl).mockResolvedValue('https://cdn.example.com/video.mp4')
    const res = await callGet(VALID_URL, 'mp4_720')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.redirectUrl).toBe('https://cdn.example.com/video.mp4')
  })

  it('returns redirectUrl for mp4_1080', async () => {
    const { getDirectUrl } = await import('@/lib/ytdlp')
    vi.mocked(getDirectUrl).mockResolvedValue('https://cdn.example.com/video-1080.mp4')
    const res = await callGet(VALID_URL, 'mp4_1080')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.redirectUrl).toBe('https://cdn.example.com/video-1080.mp4')
  })

  it('returns 500 when getDirectUrl throws', async () => {
    const { getDirectUrl } = await import('@/lib/ytdlp')
    vi.mocked(getDirectUrl).mockRejectedValue(new Error('Not found'))
    const res = await callGet(VALID_URL, 'mp4_720')
    expect(res.status).toBe(500)
  })
})
