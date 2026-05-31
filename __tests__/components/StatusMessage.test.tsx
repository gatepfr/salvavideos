import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusMessage from '@/components/StatusMessage'

describe('StatusMessage', () => {
  it('shows loading text when state is loading', () => {
    render(<StatusMessage state="loading" />)
    expect(screen.getByText(/buscando/i)).toBeInTheDocument()
  })
  it('shows downloading text when state is downloading', () => {
    render(<StatusMessage state="downloading" />)
    expect(screen.getByText(/preparando/i)).toBeInTheDocument()
  })
  it('shows custom error message when state is error', () => {
    render(<StatusMessage state="error" message="URL inválida." />)
    expect(screen.getByText('URL inválida.')).toBeInTheDocument()
  })
  it('shows fallback error message when no message prop', () => {
    render(<StatusMessage state="error" />)
    expect(screen.getByText(/ocorreu um erro/i)).toBeInTheDocument()
  })
})
