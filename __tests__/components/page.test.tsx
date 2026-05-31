import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from '@/app/page'

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('Home page', () => {
  it('renders the site name and input', () => {
    render(<Home />)
    expect(screen.getByText('Salva Videos')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows loading state while fetching', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    render(<Home />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText(/buscando/i)).toBeInTheDocument()
  })

  it('shows error when API returns error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Este vídeo não está disponível.' }),
    } as any)
    render(<Home />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText('Este vídeo não está disponível.')).toBeInTheDocument()
  })

  it('shows video preview after successful fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Video Title',
        thumbnail: 'https://img.jpg',
        duration: 60,
        platform: 'youtube',
        formats: ['mp4_720', 'mp4_1080', 'mp3'],
      }),
    } as any)
    render(<Home />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(await screen.findByText('Video Title')).toBeInTheDocument()
    expect(screen.getByText('MP4 720p')).toBeInTheDocument()
  })
})
