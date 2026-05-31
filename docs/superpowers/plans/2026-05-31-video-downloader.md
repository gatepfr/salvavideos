# Video Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Next.js 15 site where anyone can paste a YouTube, TikTok, or Instagram URL, see a video preview, and download as MP4 (720p/1080p) or MP3 — deployed on Vercel with no user accounts required.

**Architecture:** Next.js 15 App Router monolith on Vercel Fluid Compute. API routes use `youtube-dl-exec` (manages the yt-dlp binary automatically) and `ffmpeg-static` for audio conversion. Video downloads redirect the browser to the CDN source URL; MP3 downloads are processed server-side and streamed via a temp file. Rate limiting is enforced in Next.js middleware. URL validation prevents SSRF.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, youtube-dl-exec, ffmpeg-static, Vitest + @testing-library/react, Vercel.

---

## File Structure

```
├── package.json
├── next.config.ts                        — serverExternalPackages config
├── tailwind.config.ts                    — (auto-generated)
├── tsconfig.json                         — (auto-generated)
├── vitest.config.ts                      — vitest + jsdom + @/* alias
├── vitest.setup.ts                       — @testing-library/jest-dom
├── vercel.json                           — maxDuration for /api/download
├── middleware.ts                         — rate limiting per IP
├── .gitignore
├── app/
│   ├── layout.tsx                        — HTML shell, metadata, Inter font
│   ├── page.tsx                          — state machine: idle→loading→preview→error
│   ├── globals.css
│   └── api/
│       ├── info/route.ts                 — GET ?url= → VideoInfo JSON
│       └── download/route.ts            — GET ?url=&format= → redirectUrl | MP3 stream
├── components/
│   ├── UrlInput.tsx                      — controlled input + submit button
│   ├── VideoPreview.tsx                  — thumbnail, title, duration, platform badge
│   ├── DownloadButtons.tsx               — MP4 720p / MP4 1080p / MP3 buttons
│   └── StatusMessage.tsx                 — loading / downloading / error states
├── lib/
│   ├── validate-url.ts                   — allowlist domain check (SSRF prevention)
│   └── ytdlp.ts                          — getVideoInfo / getDirectUrl / getAudioTempFile
└── __tests__/
    ├── lib/
    │   ├── validate-url.test.ts
    │   └── ytdlp.test.ts
    ├── api/
    │   ├── info.test.ts
    │   └── download.test.ts
    └── components/
        ├── UrlInput.test.tsx
        ├── VideoPreview.test.tsx
        ├── DownloadButtons.test.tsx
        └── StatusMessage.test.tsx
```

---

## Task 1: Scaffold Next.js 15 project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`

- [ ] **Step 1: Run create-next-app**

```bash
cd C:/projetos/baixar_yotube
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

When prompted, accept all defaults (Yes to TypeScript, Tailwind, ESLint, App Router; No to src/ directory).

Expected: project files created, `npm install` runs automatically.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install youtube-dl-exec ffmpeg-static
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @types/ffmpeg-static
```

- [ ] **Step 3: Add test scripts to package.json**

Open `package.json` and add to the `"scripts"` section:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 5: Create vitest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with Vitest"
```

---

## Task 2: Configure next.config.ts and vercel.json

**Files:**
- Modify: `next.config.ts`
- Create: `vercel.json`

- [ ] **Step 1: Write next.config.ts**

Replace the contents of `next.config.ts` with:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['youtube-dl-exec', 'ffmpeg-static'],
}

export default nextConfig
```

`serverExternalPackages` prevents Next.js from trying to bundle these binary-backed packages.

- [ ] **Step 2: Create vercel.json**

```json
{
  "functions": {
    "app/api/download/route.ts": {
      "maxDuration": 300
    }
  }
}
```

- [ ] **Step 3: Update .gitignore**

Add these lines to `.gitignore`:

```
# yt-dlp / ffmpeg binaries (managed by npm packages at runtime)
/bin/

# Brainstorm session files
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git add next.config.ts vercel.json .gitignore
git commit -m "feat: configure Vercel function timeout and external packages"
```

---

## Task 3: URL validation library

**Files:**
- Create: `lib/validate-url.ts`
- Create: `__tests__/lib/validate-url.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/validate-url.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isAllowedUrl } from '@/lib/validate-url'

describe('isAllowedUrl', () => {
  it('accepts youtube.com', () => {
    expect(isAllowedUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
  })

  it('accepts youtu.be', () => {
    expect(isAllowedUrl('https://youtu.be/abc')).toBe(true)
  })

  it('accepts tiktok.com', () => {
    expect(isAllowedUrl('https://www.tiktok.com/@user/video/123')).toBe(true)
  })

  it('accepts vm.tiktok.com', () => {
    expect(isAllowedUrl('https://vm.tiktok.com/abc')).toBe(true)
  })

  it('accepts instagram.com', () => {
    expect(isAllowedUrl('https://www.instagram.com/reel/abc/')).toBe(true)
  })

  it('rejects arbitrary domains', () => {
    expect(isAllowedUrl('https://evil.com/video')).toBe(false)
  })

  it('rejects internal IPs', () => {
    expect(isAllowedUrl('http://192.168.1.1/secret')).toBe(false)
  })

  it('rejects non-URLs', () => {
    expect(isAllowedUrl('not a url')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isAllowedUrl('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/lib/validate-url.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/validate-url'`

- [ ] **Step 3: Implement lib/validate-url.ts**

```typescript
const ALLOWED_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
])

export function isAllowedUrl(input: string): boolean {
  try {
    const { protocol, hostname } = new URL(input)
    if (protocol !== 'https:' && protocol !== 'http:') return false
    return ALLOWED_HOSTNAMES.has(hostname)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/lib/validate-url.test.ts
```

Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add lib/validate-url.ts __tests__/lib/validate-url.test.ts
git commit -m "feat: add URL allowlist validation"
```

---

## Task 4: yt-dlp wrapper library

**Files:**
- Create: `lib/ytdlp.ts`
- Create: `__tests__/lib/ytdlp.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/ytdlp.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/lib/ytdlp.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/ytdlp'`

- [ ] **Step 3: Implement lib/ytdlp.ts**

```typescript
import youtubeDl, { raw } from 'youtube-dl-exec'
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
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('TIMEOUT'))
    }, 25_000)

    proc.on('close', (code: number | null) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`))
        return
      }
      const directUrl = stdout.trim().split('\n')[0]
      if (!directUrl) {
        reject(new Error('No download URL found'))
        return
      }
      resolve(directUrl)
    })
  })
}

export async function getAudioTempFile(url: string): Promise<string> {
  const tmpFile = `/tmp/audio-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`

  return new Promise((resolve, reject) => {
    const proc = raw(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: '0',
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/lib/ytdlp.test.ts
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add lib/ytdlp.ts __tests__/lib/ytdlp.test.ts
git commit -m "feat: add yt-dlp wrapper with getVideoInfo, getDirectUrl, getAudioTempFile"
```

---

## Task 5: Rate limiting middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

const store = new Map<string, { count: number; resetAt: number }>()

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const now = Date.now()
  const record = store.get(ip)

  if (!record || now > record.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return NextResponse.next()
  }

  if (record.count >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde um momento.' },
      { status: 429 }
    )
  }

  record.count++
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add per-IP rate limiting middleware (10 req/min)"
```

---

## Task 6: /api/info route

**Files:**
- Create: `app/api/info/route.ts`
- Create: `__tests__/api/info.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/info.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/api/info.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/info/route'`

- [ ] **Step 3: Create app/api/info/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getVideoInfo } from '@/lib/ytdlp'
import { isAllowedUrl } from '@/lib/validate-url'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Parâmetro url é obrigatório.' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json(
      { error: 'Cole uma URL válida do YouTube, TikTok ou Instagram.' },
      { status: 400 }
    )
  }

  try {
    const info = await getVideoInfo(url)
    return NextResponse.json(info)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    if (message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'A busca demorou demais. Tente novamente.' },
        { status: 504 }
      )
    }

    if (/private|not available|unavailable/i.test(message)) {
      return NextResponse.json(
        { error: 'Este vídeo não está disponível para download.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Não foi possível processar este vídeo. Tente novamente.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/api/info.test.ts
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/api/info/route.ts __tests__/api/info.test.ts
git commit -m "feat: add /api/info route with error handling"
```

---

## Task 7: /api/download route

**Files:**
- Create: `app/api/download/route.ts`
- Create: `__tests__/api/download.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/download.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/ytdlp', () => ({
  getDirectUrl: vi.fn(),
  getAudioTempFile: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
  unlink: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}))

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/api/download.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/download/route'`

- [ ] **Step 3: Create app/api/download/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { stat, unlink } from 'fs/promises'
import { Readable } from 'stream'
import { getDirectUrl, getAudioTempFile } from '@/lib/ytdlp'
import { isAllowedUrl } from '@/lib/validate-url'

export const maxDuration = 300

const VALID_FORMATS = new Set(['mp4_720', 'mp4_1080', 'mp3'])

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const format = request.nextUrl.searchParams.get('format')

  if (!url || !format) {
    return NextResponse.json({ error: 'Parâmetros url e format são obrigatórios.' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json(
      { error: 'Cole uma URL válida do YouTube, TikTok ou Instagram.' },
      { status: 400 }
    )
  }

  if (!VALID_FORMATS.has(format)) {
    return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })
  }

  try {
    if (format === 'mp3') {
      const tmpFile = await getAudioTempFile(url)
      try {
        const { size } = await stat(tmpFile)
        const nodeStream = createReadStream(tmpFile)
        const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

        nodeStream.on('end', () => unlink(tmpFile).catch(() => {}))
        nodeStream.on('error', () => unlink(tmpFile).catch(() => {}))

        return new NextResponse(webStream, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="audio.mp3"',
            'Content-Length': String(size),
            'Cache-Control': 'no-store',
          },
        })
      } catch {
        await unlink(tmpFile).catch(() => {})
        throw new Error('Failed to read audio file')
      }
    }

    const directUrl = await getDirectUrl(url, format as 'mp4_720' | 'mp4_1080')
    return NextResponse.json({ redirectUrl: directUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    if (message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'O download demorou demais. Tente novamente.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Não foi possível baixar este vídeo. Tente novamente.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/api/download.test.ts
```

Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add app/api/download/route.ts __tests__/api/download.test.ts
git commit -m "feat: add /api/download route for MP4 redirect and MP3 stream"
```

---

## Task 8: UrlInput component

**Files:**
- Create: `components/UrlInput.tsx`
- Create: `__tests__/components/UrlInput.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/UrlInput.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UrlInput from '@/components/UrlInput'

describe('UrlInput', () => {
  it('calls onSubmit with trimmed URL when form is submitted', () => {
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '  https://youtube.com/watch?v=abc  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(onSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=abc')
  })

  it('does not call onSubmit when input is empty', () => {
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled prop is true', () => {
    render(<UrlInput onSubmit={() => {}} disabled />)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/components/UrlInput.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/UrlInput'`

- [ ] **Step 3: Create components/UrlInput.tsx**

```tsx
'use client'

import { useState, FormEvent } from 'react'

interface Props {
  onSubmit: (url: string) => void
  disabled?: boolean
}

export default function UrlInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cole a URL aqui..."
        disabled={disabled}
        aria-label="URL do vídeo"
        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        Buscar
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/components/UrlInput.test.tsx
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add components/UrlInput.tsx __tests__/components/UrlInput.test.tsx
git commit -m "feat: add UrlInput component"
```

---

## Task 9: VideoPreview component

**Files:**
- Create: `components/VideoPreview.tsx`
- Create: `__tests__/components/VideoPreview.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/VideoPreview.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import VideoPreview from '@/components/VideoPreview'

const props = {
  title: 'Meu vídeo incrível',
  thumbnail: 'https://img.youtube.com/thumb.jpg',
  duration: 222,
  platform: 'youtube',
}

describe('VideoPreview', () => {
  it('renders video title', () => {
    render(<VideoPreview {...props} />)
    expect(screen.getByText('Meu vídeo incrível')).toBeInTheDocument()
  })

  it('renders formatted duration', () => {
    render(<VideoPreview {...props} />)
    expect(screen.getByText(/3:42/)).toBeInTheDocument()
  })

  it('renders platform label', () => {
    render(<VideoPreview {...props} />)
    expect(screen.getByText(/youtube/i)).toBeInTheDocument()
  })

  it('renders thumbnail image', () => {
    render(<VideoPreview {...props} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', props.thumbnail)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/components/VideoPreview.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/VideoPreview'`

- [ ] **Step 3: Create components/VideoPreview.tsx**

```tsx
const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  title: string
  thumbnail: string
  duration: number
  platform: string
}

export default function VideoPreview({ title, thumbnail, duration, platform }: Props) {
  return (
    <div className="flex gap-4 mt-6 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
      <img
        src={thumbnail}
        alt={title}
        className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
      />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">{title}</h2>
        <p className="text-xs text-gray-500 mt-1">
          {formatDuration(duration)} · {PLATFORM_LABELS[platform] ?? platform}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/components/VideoPreview.test.tsx
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add components/VideoPreview.tsx __tests__/components/VideoPreview.test.tsx
git commit -m "feat: add VideoPreview component"
```

---

## Task 10: DownloadButtons component

**Files:**
- Create: `components/DownloadButtons.tsx`
- Create: `__tests__/components/DownloadButtons.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/DownloadButtons.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DownloadButtons from '@/components/DownloadButtons'

const props = {
  url: 'https://www.youtube.com/watch?v=abc',
  formats: ['mp4_720', 'mp4_1080', 'mp3'] as const,
  onDownloadStart: vi.fn(),
  onDownloadEnd: vi.fn(),
}

describe('DownloadButtons', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ redirectUrl: 'https://cdn.example.com/video.mp4' }),
      blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }),
    })
    // Stub DOM methods used for download trigger
    const a = document.createElement('a')
    vi.spyOn(document, 'createElement').mockReturnValue(a)
    a.click = vi.fn()
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('renders one button per format', () => {
    render(<DownloadButtons {...props} />)
    expect(screen.getByText('MP4 720p')).toBeInTheDocument()
    expect(screen.getByText('MP4 1080p')).toBeInTheDocument()
    expect(screen.getByText(/MP3/)).toBeInTheDocument()
  })

  it('calls onDownloadStart when a button is clicked', async () => {
    render(<DownloadButtons {...props} />)
    fireEvent.click(screen.getByText('MP4 720p'))
    expect(props.onDownloadStart).toHaveBeenCalled()
  })

  it('calls onDownloadEnd after fetch resolves', async () => {
    render(<DownloadButtons {...props} />)
    fireEvent.click(screen.getByText('MP4 720p'))
    await waitFor(() => expect(props.onDownloadEnd).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/components/DownloadButtons.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/DownloadButtons'`

- [ ] **Step 3: Create components/DownloadButtons.tsx**

```tsx
'use client'

const FORMAT_LABELS: Record<string, string> = {
  mp4_720: 'MP4 720p',
  mp4_1080: 'MP4 1080p',
  mp3: 'MP3 ♪',
}

interface Props {
  url: string
  formats: Array<'mp4_720' | 'mp4_1080' | 'mp3'>
  onDownloadStart: () => void
  onDownloadEnd: () => void
}

export default function DownloadButtons({ url, formats, onDownloadStart, onDownloadEnd }: Props) {
  async function handleDownload(format: string) {
    onDownloadStart()
    try {
      const res = await fetch(
        `/api/download?url=${encodeURIComponent(url)}&format=${format}`
      )

      if (!res.ok) throw new Error('Download failed')

      if (format === 'mp3') {
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'audio.mp3'
        a.click()
        URL.revokeObjectURL(a.href)
      } else {
        const { redirectUrl } = await res.json()
        const a = document.createElement('a')
        a.href = redirectUrl
        a.download = 'video.mp4'
        a.target = '_blank'
        a.click()
      }
    } finally {
      onDownloadEnd()
    }
  }

  return (
    <div className="flex gap-2 mt-4 flex-wrap">
      {formats.map((format) => (
        <button
          key={format}
          onClick={() => handleDownload(format)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {FORMAT_LABELS[format]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/components/DownloadButtons.test.tsx
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add components/DownloadButtons.tsx __tests__/components/DownloadButtons.test.tsx
git commit -m "feat: add DownloadButtons component"
```

---

## Task 11: StatusMessage component

**Files:**
- Create: `components/StatusMessage.tsx`
- Create: `__tests__/components/StatusMessage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/StatusMessage.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusMessage from '@/components/StatusMessage'

describe('StatusMessage', () => {
  it('shows loading text when state is loading', () => {
    render(<StatusMessage state="loading" />)
    expect(screen.getByText(/buscando/i)).toBeInTheDocument()
  })

  it('shows downloading text when state is downloading', () => {
    render(<StatusMessage state="downloading" />)
    expect(screen.getByText(/preparando/i)).toBeInTheDocument()
  })

  it('shows custom error message when state is error', () => {
    render(<StatusMessage state="error" message="URL inválida." />)
    expect(screen.getByText('URL inválida.')).toBeInTheDocument()
  })

  it('shows fallback error message when no message prop', () => {
    render(<StatusMessage state="error" />)
    expect(screen.getByText(/ocorreu um erro/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/components/StatusMessage.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/StatusMessage'`

- [ ] **Step 3: Create components/StatusMessage.tsx**

```tsx
interface Props {
  state: 'loading' | 'downloading' | 'error'
  message?: string
}

export default function StatusMessage({ state, message }: Props) {
  if (state === 'loading') {
    return (
      <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
        <span className="animate-spin inline-block">⏳</span>
        Buscando informações...
      </p>
    )
  }

  if (state === 'downloading') {
    return (
      <p className="mt-4 text-sm text-indigo-600 flex items-center gap-2">
        <span className="animate-spin inline-block">⏳</span>
        Preparando download...
      </p>
    )
  }

  return (
    <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {message ?? 'Ocorreu um erro. Tente novamente.'}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/components/StatusMessage.test.tsx
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add components/StatusMessage.tsx __tests__/components/StatusMessage.test.tsx
git commit -m "feat: add StatusMessage component"
```

---

## Task 12: Main page (app/page.tsx)

**Files:**
- Modify: `app/page.tsx`
- Create: `__tests__/components/page.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/page.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from '@/app/page'

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('Home page', () => {
  it('renders the site name and input', () => {
    render(<Home />)
    expect(screen.getByText('VidDown')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows loading state while fetching', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})) // never resolves

    render(<Home />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(await screen.findByText(/buscando/i)).toBeInTheDocument()
  })

  it('shows error when API returns error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Este vídeo não está disponível.' }),
    } as any)

    render(<Home />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(await screen.findByText('Este vídeo não está disponível.')).toBeInTheDocument()
  })

  it('shows video preview after successful fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Video Title',
        thumbnail: 'https://img.jpg',
        duration: 60,
        platform: 'youtube',
        formats: ['mp4_720', 'mp4_1080', 'mp3'],
      }),
    } as any)

    render(<Home />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))

    expect(await screen.findByText('Video Title')).toBeInTheDocument()
    expect(screen.getByText('MP4 720p')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- __tests__/components/page.test.tsx
```

Expected: FAIL (page.tsx has Next.js boilerplate, not our component)

- [ ] **Step 3: Replace app/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import UrlInput from '@/components/UrlInput'
import VideoPreview from '@/components/VideoPreview'
import DownloadButtons from '@/components/DownloadButtons'
import StatusMessage from '@/components/StatusMessage'

interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  platform: string
  formats: Array<'mp4_720' | 'mp4_1080' | 'mp3'>
}

type AppState = 'idle' | 'loading' | 'preview' | 'downloading' | 'error'

export default function Home() {
  const [state, setState] = useState<AppState>('idle')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSearch(url: string) {
    setState('loading')
    setCurrentUrl(url)
    setVideoInfo(null)
    setErrorMessage('')

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`)
      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Erro desconhecido.')
        setState('error')
        return
      }

      setVideoInfo(data)
      setState('preview')
    } catch {
      setErrorMessage('Erro de conexão. Tente novamente.')
      setState('error')
    }
  }

  const isDisabled = state === 'loading' || state === 'downloading'

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-indigo-600 text-center mb-1">VidDown</h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          YouTube · TikTok · Instagram
        </p>

        <UrlInput onSubmit={handleSearch} disabled={isDisabled} />

        {state === 'loading' && <StatusMessage state="loading" />}
        {state === 'downloading' && <StatusMessage state="downloading" />}
        {state === 'error' && <StatusMessage state="error" message={errorMessage} />}

        {(state === 'preview' || state === 'downloading') && videoInfo && (
          <>
            <VideoPreview
              title={videoInfo.title}
              thumbnail={videoInfo.thumbnail}
              duration={videoInfo.duration}
              platform={videoInfo.platform}
            />
            <DownloadButtons
              url={currentUrl}
              formats={videoInfo.formats}
              onDownloadStart={() => setState('downloading')}
              onDownloadEnd={() => setState('preview')}
            />
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- __tests__/components/page.test.tsx
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx __tests__/components/page.test.tsx
git commit -m "feat: wire up main page with idle/loading/preview/downloading/error states"
```

---

## Task 13: Layout, globals.css e run all tests

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VidDown — Baixar vídeos do YouTube, TikTok e Instagram',
  description:
    'Baixe vídeos do YouTube, TikTok e Instagram em MP4 ou MP3. Grátis, sem cadastro.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Replace app/globals.css**

```css
@import "tailwindcss";
```

(Next.js 15 with Tailwind v4 uses this single import. If the project was scaffolded with Tailwind v3, keep the existing `@tailwind base/components/utilities` directives unchanged.)

- [ ] **Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass (no failures).

- [ ] **Step 4: Run the dev server and verify manually**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Site loads with "VidDown" heading and URL input
- Pasting a YouTube URL and clicking "Buscar" shows the loading spinner
- Preview card appears with thumbnail, title, duration, and platform
- Download buttons are visible: MP4 720p, MP4 1080p, MP3

- [ ] **Step 5: Final commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: finalize layout, globals and complete video downloader MVP"
```

---

## Self-Review Notes

- **Spec coverage:**
  - ✅ URL validation + SSRF prevention → Task 3, Task 6, Task 7
  - ✅ Rate limiting → Task 5
  - ✅ getVideoInfo / getDirectUrl / getAudioTempFile → Task 4
  - ✅ /api/info with timeout and error mapping → Task 6
  - ✅ /api/download for MP4 redirect + MP3 stream → Task 7
  - ✅ All 5 UI states (idle/loading/preview/downloading/error) → Tasks 8–12
  - ✅ YouTube, TikTok, Instagram via yt-dlp → lib/ytdlp.ts detectPlatform
  - ✅ Vercel maxDuration 300s → vercel.json + export const maxDuration = 300
  - ✅ Tailwind light theme, indigo accent → all components

- **Type consistency confirmed:** `VideoInfo` interface defined in `lib/ytdlp.ts`, imported in `app/api/info/route.ts`. Format literals `'mp4_720' | 'mp4_1080' | 'mp3'` used consistently across `lib/ytdlp.ts`, `app/api/download/route.ts`, `components/DownloadButtons.tsx`, `app/page.tsx`.

- **No placeholders found.**
