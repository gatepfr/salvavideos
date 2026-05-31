import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import { Readable } from 'stream'

vi.mock('youtube-dl-exec', () => ({
  default: vi.fn(),
  raw: vi.fn(),
}))

vi.mock('ffmpeg-static', () => ({ default: '/usr/bin/ffmpeg' }))

function makeFakeProc(stdoutData: string, exitCode = 0) {
  const emitter = new EventEmitter() as any
  emitter.stdout = new Readable({ read() {} })
  emitter.stderr = new Readable({ read() {} })
  emitter.kill = vi.fn()
  process.nextTick(() => {
    emitter.stdout.push(stdoutData)
    emitter.stdout.push(null)
    emitter.stderr.push(null)
    emitter.emit('close', exitCode)
  })
  return emitter
}

describe('getVideoInfo', () => {
  beforeEach(() => vi.resetAllMocks())

  it('parses yt-dlp JSON and detects platform', async () => {
    const { default: youtubeDl } = await import('youtube-dl-exec')
    vi.mocked(youtubeDl).mockResolvedValue({
      title: 'Test Video',
      thumbnail: 'https://img.jpg',
      duration: 120,
      webpage_url: 'https://www.youtube.com/watch?v=abc',
    } as any)

    const { getVideoInfo } = await import('@/lib/ytdlp')
    const info = await getVideoInfo('https://www.youtube.com/watch?v=abc')

    expect(info.title).toBe('Test Video')
    expect(info.thumbnail).toBe('https://img.jpg')
    expect(info.duration).toBe(120)
    expect(info.platform).toBe('youtube')
    expect(info.formats).toEqual(['mp4_720', 'mp4_1080', 'mp3'])
  })

  it('rejects when yt-dlp throws', async () => {
    const { default: youtubeDl } = await import('youtube-dl-exec')
    vi.mocked(youtubeDl).mockRejectedValue(new Error('Video unavailable'))

    const { getVideoInfo } = await import('@/lib/ytdlp')
    await expect(getVideoInfo('https://www.youtube.com/watch?v=abc')).rejects.toThrow()
  })
})

describe('getDirectUrl', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns first line of yt-dlp stdout', async () => {
    const { raw } = await import('youtube-dl-exec')
    vi.mocked(raw).mockReturnValue(
      makeFakeProc('https://cdn.example.com/video.mp4\nhttps://cdn.example.com/audio.m4a\n')
    )

    const { getDirectUrl } = await import('@/lib/ytdlp')
    const url = await getDirectUrl('https://www.youtube.com/watch?v=abc', 'mp4_720')
    expect(url).toBe('https://cdn.example.com/video.mp4')
  })

  it('rejects on non-zero exit', async () => {
    const { raw } = await import('youtube-dl-exec')
    vi.mocked(raw).mockReturnValue(makeFakeProc('', 1))

    const { getDirectUrl } = await import('@/lib/ytdlp')
    await expect(
      getDirectUrl('https://www.youtube.com/watch?v=abc', 'mp4_720')
    ).rejects.toThrow()
  })
})
