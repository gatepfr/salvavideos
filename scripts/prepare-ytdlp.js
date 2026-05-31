const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

if (process.platform !== 'linux') {
  console.log('[prepare-ytdlp] Not Linux — skipping standalone binary download')
  process.exit(0)
}

const binDir = path.join(__dirname, '..', 'node_modules', 'youtube-dl-exec', 'bin')
const target = path.join(binDir, 'yt-dlp')

try {
  fs.mkdirSync(binDir, { recursive: true })
  console.log('[prepare-ytdlp] Downloading yt-dlp_linux standalone binary...')
  execSync(
    `curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o "${target}"`,
    { stdio: 'inherit' }
  )
  fs.chmodSync(target, 0o755)
  console.log('[prepare-ytdlp] Done.')
} catch (err) {
  console.error('[prepare-ytdlp] Failed:', err.message)
  process.exit(1)
}
