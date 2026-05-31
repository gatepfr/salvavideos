import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = 'https://salvavideos.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Salva Videos — Baixar Vídeos do YouTube, TikTok e Instagram Grátis',
    template: '%s | Salva Videos',
  },
  description:
    'Baixe vídeos do YouTube, TikTok e Instagram em MP4 HD ou converta para MP3. Grátis, sem cadastro, sem limite. O jeito mais fácil de salvar vídeos online.',
  keywords: [
    'baixar vídeo youtube',
    'baixar vídeo tiktok',
    'baixar vídeo instagram',
    'baixar mp3 youtube',
    'conversor youtube mp3',
    'baixar reels instagram',
    'salvar vídeo youtube',
    'download vídeo online grátis',
    'youtube downloader',
    'tiktok downloader',
    'instagram downloader',
  ],
  authors: [{ name: 'Salva Videos' }],
  creator: 'Salva Videos',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'Salva Videos',
    title: 'Salva Videos — Baixar Vídeos do YouTube, TikTok e Instagram',
    description:
      'Baixe vídeos do YouTube, TikTok e Instagram em MP4 HD ou MP3. Grátis, rápido e sem cadastro.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salva Videos — Baixar Vídeos Grátis',
    description:
      'Baixe vídeos do YouTube, TikTok e Instagram em MP4 ou MP3. Grátis e sem cadastro.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Salva Videos',
              url: siteUrl,
              description:
                'Baixe vídeos do YouTube, TikTok e Instagram em MP4 HD ou MP3. Grátis, sem cadastro.',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'BRL',
              },
              inLanguage: 'pt-BR',
            }),
          }}
        />
      </body>
    </html>
  )
}
