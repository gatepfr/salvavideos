#!/usr/bin/env node
// Downloads yt-dlp binary to bin/ during Render build.
// Safe to run multiple times — skips download if binary already exists.
import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BIN_DIR = join(__dirname, '..', 'bin')
const BIN_PATH = join(BIN_DIR, 'yt-dlp')

const RELEASE_URL =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'

if (existsSync(BIN_PATH)) {
  console.log('yt-dlp already present, skipping download.')
  process.exit(0)
}

mkdirSync(BIN_DIR, { recursive: true })

function download(url, dest, redirects = 0) {
  if (redirects > 5) throw new Error('Too many redirects')
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest, redirects + 1)
          .then(resolve)
          .catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const file = createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    }).on('error', reject)
  })
}

console.log('Downloading yt-dlp...')
download(RELEASE_URL, BIN_PATH)
  .then(() => {
    chmodSync(BIN_PATH, 0o755)
    console.log('yt-dlp downloaded and ready at', BIN_PATH)
  })
  .catch((err) => {
    console.error('Failed to download yt-dlp:', err.message)
    process.exit(1)
  })
