import youtubeDl, { exec as raw } from 'youtube-dl-exec'
import ffmpegPath from 'ffmpeg-static'

export interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  platform: string
  formats: Array<'mp4_720' | 'mp4_1080' | 'mp3'>
}

interface YtdlpJsonOutput {
  title: string
  thumbnail: string
  duration?: number
  webpage_url?: string
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const data = (await youtubeDl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noPlaylist: true,
  })) as YtdlpJsonOutput

  return {
    title: data.title,
    thumbnail: data.thumbnail,
    duration: data.duration ?? 0,
    platform: detectPlatform(data.webpage_url ?? url),
    formats: ['mp4_720', 'mp4_1080', 'mp3'],
  }
}

export async function getDirectUrl(
  url: string,
  format: 'mp4_720' | 'mp4_1080'
): Promise<string> {
  const formatSelector =
    format === 'mp4_1080'
      ? 'best[height<=1080][ext=mp4]/best[height<=1080]/best'
      : 'best[height<=720][ext=mp4]/best[height<=720]/best'

  return new Promise((resolve, reject) => {
    const proc = raw(url, {
      getUrl: true,
      noWarnings: true,
      noPlaylist: true,
      format: formatSelector,
    })

    let stdout = ''
    let stderr = ''
    let exitCode: number | null = null
    let stdoutEnded = false

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('TIMEOUT'))
    }, 25_000)

    function tryResolve() {
      if (exitCode === null || !stdoutEnded) return
      clearTimeout(timer)
      if (exitCode !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${exitCode}`))
        return
      }
      const directUrl = stdout.trim().split('\n')[0]
      if (!directUrl) {
        reject(new Error('No download URL found'))
        return
      }
      resolve(directUrl)
    }

    proc.stdout?.on('end', () => { stdoutEnded = true; tryResolve() })

    proc.on('close', (code: number | null) => {
      exitCode = code
      tryResolve()
    })
  })
}

export async function getAudioTempFile(url: string): Promise<string> {
  const tmpFile = `/tmp/audio-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`

  return new Promise((resolve, reject) => {
    const proc = raw(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      ffmpegLocation: ffmpegPath ?? undefined,
      noPlaylist: true,
      noWarnings: true,
      output: tmpFile,
    })

    let stderr = ''
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('TIMEOUT'))
    }, 270_000)

    proc.on('close', (code: number | null) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`))
        return
      }
      resolve(tmpFile)
    })
  })
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  return 'unknown'
}
