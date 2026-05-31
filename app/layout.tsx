import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VidDown — Baixar vídeos do YouTube, TikTok e Instagram',
  description: 'Baixe vídeos do YouTube, TikTok e Instagram em MP4 ou MP3. Grátis, sem cadastro.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50`}>{children}</body>
    </html>
  )
}
