'use client'

const FORMAT_LABELS: Record<string, string> = {
  mp4_720: 'MP4 720p',
  mp4_1080: 'MP4 1080p',
  mp3: 'MP3 ♪',
}

interface Props {
  url: string
  formats: ReadonlyArray<'mp4_720' | 'mp4_1080' | 'mp3'>
  onDownloadStart: () => void
  onDownloadEnd: () => void
}

export default function DownloadButtons({ url, formats, onDownloadStart, onDownloadEnd }: Props) {
  async function handleDownload(format: string) {
    onDownloadStart()
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}&format=${format}`)
      if (!res.ok) throw new Error('Download failed')
      const data = await res.json()
      if (data.cobaltUrl) {
        // YouTube: server IPs are blocked, send user to cobalt.tools
        window.open(data.cobaltUrl, '_blank', 'noopener')
      } else {
        window.location.href = data.redirectUrl
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
