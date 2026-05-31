import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UrlInput from '@/components/UrlInput'

describe('UrlInput', () => {
  it('calls onSubmit with trimmed URL', () => {
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '  https://youtube.com/watch?v=abc  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(onSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=abc')
  })

  it('does not call onSubmit when input is empty', () => {
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled prop is true', () => {
    render(<UrlInput onSubmit={() => {}} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled()
  })
})
