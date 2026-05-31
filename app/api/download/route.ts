import { NextRequest, NextResponse } from 'next/server'
import { getDirectUrl } from '@/lib/ytdlp'
import { isAllowedUrl } from '@/lib/validate-url'
import { detectPlatform } from '@/lib/video-info'

export const maxDuration = 60

const VALID_FORMATS = new Set(['mp4_720', 'mp4_1080', 'mp3'])

const REFERERS: Record<string, string> = {
  tiktok: 'https://www.tiktok.com/',
  instagram: 'https://www.instagram.com/',
}

const EXTENSIONS: Record<string, string> = {
  mp4_720: 'mp4',
  mp4_1080: 'mp4',
  mp3: 'm4a',
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const format = request.nextUrl.searchParams.get('format')

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

  // YouTube blocks server IPs — send user to cobalt.tools which handles auth.
  if (platform === 'youtube') {
    return NextResponse.json({ cobaltUrl: `https://cobalt.tools/?u=${encodeURIComponent(url)}` })
  }

  try {
    const cdnUrl = await getDirectUrl(url, format as 'mp4_720' | 'mp4_1080' | 'mp3')

    // Proxy through server: CDN requires Referer header that browsers won't send
    // when following a redirect from a different origin.
    const upstream = await fetch(cdnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': REFERERS[platform] ?? 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(55_000),
    })

    if (!upstream.ok) {
      console.error('[/api/download] upstream', upstream.status, cdnUrl)
      return NextResponse.json({ error: 'Não foi possível baixar este vídeo.' }, { status: 502 })
    }

    const ext = EXTENSIONS[format] ?? 'mp4'
    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
      'Content-Disposition': `attachment; filename="video.${ext}"`,
      'Cache-Control': 'no-store',
    })
    const len = upstream.headers.get('content-length')
    if (len) headers.set('Content-Length', len)

    return new Response(upstream.body, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('[/api/download]', message)
    if (/timeout/i.test(message)) {
      return NextResponse.json({ error: 'Download demorou demais. Tente novamente.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Não foi possível baixar este vídeo.' }, { status: 500 })
  }
}
