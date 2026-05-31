import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'events'
import { getDirectUrl } from '@/lib/ytdlp'

function makeFakeSpawn(stdoutData: string, stderrData = '', exitCode = 0) {
  return vi.fn(() => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    process.nextTick(() => {
      if (stdoutData) proc.stdout.emit('data', Buffer.from(stdoutData))
      if (stderrData) proc.stderr.emit('data', Buffer.from(stderrData))
      proc.emit('close', exitCode)
    })
    return proc
  })
}

describe('getDirectUrl', () => {
  it('returns first line of yt-dlp stdout', async () => {
    const fakeSpawn = makeFakeSpawn(
      'https://cdn.example.com/video.mp4\nhttps://cdn.example.com/audio.m4a\n'
    )
    const url = await getDirectUrl(
      'https://www.youtube.com/watch?v=abc',
      'mp4_720',
      fakeSpawn as any
    )
    expect(url).toBe('https://cdn.example.com/video.mp4')
  })

  it('rejects on non-zero exit', async () => {
    const fakeSpawn = makeFakeSpawn('', 'blocked by YouTube', 1)
    await expect(
      getDirectUrl('https://www.youtube.com/watch?v=abc', 'mp4_720', fakeSpawn as any)
    ).rejects.toThrow('blocked by YouTube')
  })
})
