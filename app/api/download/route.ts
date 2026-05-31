import { NextRequest, NextResponse } from 'next/server'
import { spawnStream } from '@/lib/ytdlp'
import { isAllowedUrl } from '@/lib/validate-url'
import { detectPlatform } from '@/lib/video-info'

export const maxDuration = 60

const VALID_FORMATS = new Set(['mp4_720', 'mp4_1080', 'mp3'])

const EXTENSIONS: Record<string, string> = {
  mp4_720: 'mp4',
  mp4_1080: 'mp4',
  mp3: 'm4a',
}

function safeFilename(title: string, ext: string): string {
  const base = title
    .replace(/[\\/:*?"<>|]/g, '')   // caracteres inválidos em nome de arquivo
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'video'
  return `${base}.${ext}`
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const format = request.nextUrl.searchParams.get('format')
  const titleParam = request.nextUrl.searchParams.get('title') ?? ''

  if (!url || !format) {
    return NextResponse.json({ error: 'Parâmetros url e format são obrigatórios.' }, { status: 400 })
  }
  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
  }
  if (!VALID_FORMATS.has(format)) {
    return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })
  }

  const platform = detectPlatform(url)

  // YouTube blocks server IPs — open ssyoutube.com in a new tab.
  if (platform === 'youtube') {
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
    const ssUrl = videoId
      ? `https://www.ssyoutube.com/watch?v=${videoId}`
      : url.replace('youtube.com', 'ssyoutube.com')
    return NextResponse.json({ cobaltUrl: ssUrl })
  }

  try {
    const fmt = format as 'mp4_720' | 'mp4_1080' | 'mp3'
    const stream = await spawnStream(url, fmt)
    const ext = EXTENSIONS[format] ?? 'mp4'
    const mime = format === 'mp3' ? 'audio/mp4' : 'video/mp4'
    const filename = safeFilename(titleParam, ext)

    return new Response(stream, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('[/api/download]', message)
    if (/timeout/i.test(message)) {
      return NextResponse.json({ error: 'Download demorou demais. Tente novamente.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Não foi possível baixar este vídeo.', debug: message }, { status: 500 })
  }
}
