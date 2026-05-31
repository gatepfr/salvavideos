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
          {duration > 0 ? `${formatDuration(duration)} · ` : ''}{PLATFORM_LABELS[platform] ?? platform}
        </p>
      </div>
    </div>
  )
}
