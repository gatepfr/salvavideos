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
