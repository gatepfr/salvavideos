import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import VideoPreview from '@/components/VideoPreview'

const props = {
  title: 'Meu vídeo incrível',
  thumbnail: 'https://img.youtube.com/thumb.jpg',
  duration: 222,
  platform: 'youtube',
}

describe('VideoPreview', () => {
  it('renders video title', () => {
    render(<VideoPreview {...props} />)
    expect(screen.getByText('Meu vídeo incrível')).toBeInTheDocument()
  })
  it('renders formatted duration', () => {
    render(<VideoPreview {...props} />)
    expect(screen.getByText(/3:42/)).toBeInTheDocument()
  })
  it('renders platform label', () => {
    render(<VideoPreview {...props} />)
    expect(screen.getByText(/youtube/i)).toBeInTheDocument()
  })
  it('renders thumbnail image', () => {
    render(<VideoPreview {...props} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', props.thumbnail)
  })
})
