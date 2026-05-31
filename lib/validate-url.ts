const ALLOWED_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
])

export function isAllowedUrl(input: string): boolean {
  try {
    const { protocol, hostname } = new URL(input)
    if (protocol !== 'https:' && protocol !== 'http:') return false
    return ALLOWED_HOSTNAMES.has(hostname)
  } catch {
    return false
  }
}
