import { spawn as nodeSpawn, type SpawnOptionsWithoutStdio } from 'child_process'
import path from 'path'
import os from 'os'
import { getVideoInfo } from './video-info'

export { getVideoInfo }

const BIN_NAME = os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
export const BIN_PATH = path.join(process.cwd(), 'bin', BIN_NAME)

// Single-stream formats — no ffmpeg required.
// YouTube pre-merges streams up to 720p; above that needs ffmpeg.
const FORMAT_STRINGS: Record<'mp4_720' | 'mp4_1080' | 'mp3', string> = {
  mp4_720: 'best[ext=mp4][height<=720]/best[height<=720]',
  mp4_1080: 'best[ext=mp4]/best',
  mp3: 'bestaudio[ext=m4a]/bestaudio',
}

type SpawnFn = (cmd: string, args: string[], opts?: SpawnOptionsWithoutStdio) => ReturnType<typeof nodeSpawn>

function runYtDlp(args: string[], spawnFn: SpawnFn = nodeSpawn): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawnFn(BIN_PATH, args, { timeout: 30_000 })
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
