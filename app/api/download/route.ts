import { NextRequest, NextResponse } from 'next/server'
import { getDirectUrl } from '@/lib/ytdlp'
import { isAllowedUrl } from '@/lib/validate-url'

export const maxDuration = 60

const VALID_FORMATS = new Set(['mp4_720', 'mp4_1080', 'mp3'])

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

  try {
    const redirectUrl = await getDirectUrl(url, format as 'mp4_720' | 'mp4_1080' | 'mp3')
    return NextResponse.json({ redirectUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('[/api/download]', message)
    if (message.includes('408') || message.includes('timeout')) {
      return NextResponse.json({ error: 'Download demorou demais. Tente novamente.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Não foi possível baixar este vídeo.', debug: message }, { status: 500 })
  }
}
