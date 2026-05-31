interface CobaltRequest {
  url: string
  videoQuality?: string
  downloadMode?: 'auto' | 'audio' | 'mute'
  audioFormat?: string
  filenameStyle?: string
}

interface CobaltResponse {
  status: 'redirect' | 'tunnel' | 'picker' | 'error'
  url?: string
  filename?: string
  error?: { code: string }
}

const COBALT_API = 'https://api.cobalt.tools/'

export async function getCobaltUrl(
  url: string,
  format: 'mp4_720' | 'mp4_1080' | 'mp3'
): Promise<{ url: string; filename: string }> {
  const body: CobaltRequest = { url, filenameStyle: 'basic' }

  if (format === 'mp3') {
    body.downloadMode = 'audio'
    body.audioFormat = 'mp3'
  } else {
    body.downloadMode = 'auto'
    body.videoQuality = format === 'mp4_1080' ? '1080' : '720'
  }

  const res = await fetch(COBALT_API, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  })

  if (!res.ok) throw new Error(`cobalt ${res.status}`)

  const data: CobaltResponse = await res.json()

  if (data.status === 'error') throw new Error(data.error?.code ?? 'cobalt_error')
  if (!data.url) throw new Error('cobalt_no_url')

  return { url: data.url, filename: data.filename ?? 'video' }
}
