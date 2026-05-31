import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DownloadButtons from '@/components/DownloadButtons'

const props = {
  url: 'https://www.youtube.com/watch?v=abc',
  formats: ['mp4_720', 'mp4_1080', 'mp3'] as const,
  onDownloadStart: vi.fn(),
  onDownloadEnd: vi.fn(),
}

const realCreate = document.createElement.bind(document)

describe('DownloadButtons', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ redirectUrl: 'https://cdn.example.com/video.mp4' }),
      blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }),
    })
    const a = { click: vi.fn(), href: '', download: '', target: '' } as any
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...args: any[]) => {
      if (tag === 'a') return a
      return realCreate(tag, ...args)
    })
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('renders one button per format', () => {
    render(<DownloadButtons {...props} />)
    expect(screen.getByText('MP4 720p')).toBeInTheDocument()
    expect(screen.getByText('MP4 1080p')).toBeInTheDocument()
    expect(screen.getByText(/MP3/)).toBeInTheDocument()
  })

  it('calls onDownloadStart when a button is clicked', async () => {
    render(<DownloadButtons {...props} />)
    fireEvent.click(screen.getByText('MP4 720p'))
    expect(props.onDownloadStart).toHaveBeenCalled()
  })

  it('calls onDownloadEnd after fetch resolves', async () => {
    render(<DownloadButtons {...props} />)
    fireEvent.click(screen.getByText('MP4 720p'))
    await waitFor(() => expect(props.onDownloadEnd).toHaveBeenCalled())
  })
})
