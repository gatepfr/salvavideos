import { spawn as nodeSpawn, type SpawnOptionsWithoutStdio } from 'child_process'
import { existsSync, createWriteStream, chmodSync } from 'fs'
import https from 'https'
import path from 'path'
import os from 'os'
import { getVideoInfo as oembedVideoInfo, detectPlatform, type VideoInfo } from './video-info'

const YTDLP_URL =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'

export const BIN_PATH = process.env.YTDLP_PATH ?? (
  os.platform() === 'win32'
    ? path.join(process.cwd(), 'bin', 'yt-dlp.exe')
    : '/tmp/yt-dlp'
)

// Singleton promise so concurrent requests share one download.
let downloadPromise: Promise<void> | null = null

function downloadBinary(url: string, dest: string, hops = 0): Promise<void> {
  if (hops > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadBinary(res.headers.location!, dest, hops + 1).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`yt-dlp download failed: HTTP ${res.statusCode}`))
        return
      }
      const file = createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        chmodSync(dest, 0o755)
        resolve()
      })
      file.on('error', reject)
    }).on('error', reject)
  })
}

async function ensureBinary(): Promise<void> {
  if (existsSync(BIN_PATH)) return
  if (!downloadPromise) {
    downloadPromise = downloadBinary(YTDLP_URL, BIN_PATH).catch((e) => {
      downloadPromise = null
      throw e
    })
  }
  return downloadPromise
}

// Single-stream formats — no ffmpeg required.
// YouTube pre-merges streams up to 720p; above that needs ffmpeg.
const FORMAT_STRINGS: Record<'mp4_720' | 'mp4_1080' | 'mp3', string> = {
  mp4_720: 'best[height<=720]/best',
  mp4_1080: 'best[height<=1080]/best',
  mp3: 'bestaudio',
}

type SpawnFn = (cmd: string, args: string[], opts?: SpawnOptionsWithoutStdio) => ReturnType<typeof nodeSpawn>

async function runYtDlp(args: string[], spawnFn?: SpawnFn): Promise<string> {
  const fn = spawnFn ?? nodeSpawn
  if (!spawnFn) await ensureBinary()
  return new Promise((resolve, reject) => {
    const proc = fn(BIN_PATH, args, { timeout: 30_000 })
    let stdout = ''
    let stderr = ''
    proc.stdout!.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr!.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `yt-dlp exited ${code}`))
      else resolve(stdout.trim())
    })
    proc.on('error', reject)
  })
}

// Instagram's oEmbed API requires auth since 2020 — use yt-dlp for metadata instead.
async function getInstagramInfo(url: string, spawnFn?: SpawnFn): Promise<VideoInfo> {
  const output = await runYtDlp([
    url,
    '--print', '%(title)s\n%(thumbnail)s\n%(duration)s',
    '--no-download',
    '--no-warnings',
  ], spawnFn)
  const [title, thumbnail, durationStr] = output.split('\n')
  return {
    title: title || 'Instagram Video',
    thumbnail: thumbnail || '',
    duration: parseInt(durationStr, 10) || 0,
    platform: 'instagram',
    formats: ['mp4_720', 'mp4_1080', 'mp3'],
  }
}

export async function getVideoInfo(url: string, spawnFn?: SpawnFn): Promise<VideoInfo> {
  if (detectPlatform(url) === 'instagram') return getInstagramInfo(url, spawnFn)
  return oembedVideoInfo(url)
}

export async function getDirectUrl(
  url: string,
  format: 'mp4_720' | 'mp4_1080' | 'mp3',
  spawnFn?: SpawnFn
): Promise<string> {
  const output = await runYtDlp([
    url,
    '-g',
    '--format', FORMAT_STRINGS[format],
    '--no-warnings',
    '--extractor-args', 'youtube:player_client=ios',
  ], spawnFn)
  return output.split('\n')[0]
}
