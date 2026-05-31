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
        <h1 className="text-3xl font-bold text-indigo-600 text-center mb-1">Salva Videos</h1>
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
