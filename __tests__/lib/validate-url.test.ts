import { describe, it, expect } from 'vitest'
import { isAllowedUrl } from '@/lib/validate-url'

describe('isAllowedUrl', () => {
  it('accepts youtube.com', () => {
    expect(isAllowedUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
  })
  it('accepts youtu.be', () => {
    expect(isAllowedUrl('https://youtu.be/abc')).toBe(true)
  })
  it('accepts tiktok.com', () => {
    expect(isAllowedUrl('https://www.tiktok.com/@user/video/123')).toBe(true)
  })
  it('accepts vm.tiktok.com', () => {
    expect(isAllowedUrl('https://vm.tiktok.com/abc')).toBe(true)
  })
  it('accepts instagram.com', () => {
    expect(isAllowedUrl('https://www.instagram.com/reel/abc/')).toBe(true)
  })
  it('rejects arbitrary domains', () => {
    expect(isAllowedUrl('https://evil.com/video')).toBe(false)
  })
  it('rejects internal IPs', () => {
    expect(isAllowedUrl('http://192.168.1.1/secret')).toBe(false)
  })
  it('rejects non-URLs', () => {
    expect(isAllowedUrl('not a url')).toBe(false)
  })
  it('rejects empty string', () => {
    expect(isAllowedUrl('')).toBe(false)
  })
})
