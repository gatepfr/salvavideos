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
    console.error('[/api/info] erro:', message, error)
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
