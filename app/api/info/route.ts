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
    // Instagram CDN bloqueia acesso direto do browser — proxia pelo servidor
    const payload =
      info.platform === 'instagram' && info.thumbnail
        ? { ...info, thumbnail: `/api/thumbnail?url=${encodeURIComponent(info.thumbnail)}` }
        : info
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('[/api/info]', message)
    if (message.includes('408') || /timeout/i.test(message)) {
      return NextResponse.json({ error: 'A busca demorou demais. Tente novamente.' }, { status: 504 })
    }
    if (/private|not available|unavailable/i.test(message)) {
      return NextResponse.json({ error: 'Este vídeo não está disponível.' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Não foi possível processar este vídeo. Tente novamente.' },
      { status: 500 }
    )
  }
}
