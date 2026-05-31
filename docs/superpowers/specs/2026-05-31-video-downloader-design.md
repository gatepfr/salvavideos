# Design: Site de Download de Vídeos

**Data:** 2026-05-31  
**Status:** Aprovado

## Visão Geral

Site público sem cadastro para baixar vídeos do YouTube, TikTok e Instagram em MP4 (720p / 1080p) ou áudio MP3. O usuário cola a URL, vê uma prévia com título/thumbnail/duração e escolhe o formato.

## Stack

- **Framework:** Next.js 15 App Router + TypeScript
- **Deploy:** Vercel (Fluid Compute)
- **Downloader:** yt-dlp (binário Linux standalone, baixado no build via `postinstall`)
- **Áudio:** ffmpeg (binário Linux standalone, baixado no build via `postinstall`)
- **Estilo:** Tailwind CSS — tema light, cor de destaque índigo/roxo (`#6366f1`)

## Arquitetura

```
Next.js App (Vercel)
├── Frontend (React)
│   └── página única com estados: idle → loading → preview → erro
└── API Routes (Node.js / Fluid Compute)
    ├── GET /api/info?url=...      → metadados do vídeo
    └── GET /api/download?url=...&format=...  → URL direta (vídeo) ou stream (MP3)
```

Os binários `yt-dlp` e `ffmpeg` ficam em `/bin/` no projeto e são executados via `child_process.spawn`. Não são commitados no git — baixados automaticamente no `postinstall`.

## Rotas de API

### `GET /api/info?url=<url>`

Executa `yt-dlp --dump-json <url>` e retorna:

```json
{
  "title": "Nome do vídeo",
  "thumbnail": "https://...",
  "duration": 222,
  "platform": "youtube",
  "formats": ["mp4_720", "mp4_1080", "mp3"]
}
```

**Timeout:** 30 segundos.

### `GET /api/download?url=<url>&format=<mp4_720|mp4_1080|mp3>`

- **MP4:** executa `yt-dlp --get-url` para obter a URL direta da CDN → responde com `{ "redirectUrl": "https://..." }` → frontend redireciona o navegador para download direto (sem proxy Vercel)
- **MP3:** executa `yt-dlp -x --audio-format mp3` com pipe para `ffmpeg` → faz stream do arquivo `.mp3` direto na resposta HTTP com `Content-Disposition: attachment`

**Timeout:** 300 segundos (limite Vercel).

## Componentes Frontend

```
app/
├── page.tsx
├── components/
│   ├── UrlInput.tsx          — input controlado + botão "Buscar"
│   ├── VideoPreview.tsx      — thumbnail, título, duração, badge de plataforma
│   ├── DownloadButtons.tsx   — botões MP4 720p / MP4 1080p / MP3
│   └── StatusMessage.tsx     — loading / erro / mensagem de sucesso
└── api/
    ├── info/route.ts
    └── download/route.ts
```

## Estados da UI

| Estado | Descrição |
|---|---|
| `idle` | Só o input visível |
| `loading` | Spinner — buscando metadados |
| `preview` | Card com thumbnail + botões de download |
| `downloading` | Botão com indicação de progresso (MP3) |
| `error` | Mensagem amigável + opção de tentar novamente |

## Segurança

- **Validação de domínio:** A API aceita apenas URLs dos domínios `youtube.com`, `youtu.be`, `tiktok.com`, `instagram.com`. Rejeita qualquer outra origem (previne SSRF).
- **Rate limiting:** Middleware Next.js limita a 10 requisições por minuto por IP usando cabeçalho `x-forwarded-for`.
- **Sanitização:** A URL passada ao yt-dlp é escapada e passada como argumento posicional (não interpolada em shell string) para evitar injeção de comando.

## Tratamento de Erros

| Situação | Mensagem ao usuário |
|---|---|
| URL inválida / domínio não suportado | "Cole uma URL válida do YouTube, TikTok ou Instagram." |
| Vídeo privado ou indisponível | "Este vídeo não está disponível para download." |
| Formato não encontrado | "Formato não disponível para este vídeo." |
| Timeout na busca de info | "A busca demorou demais. Tente novamente." |
| Erro genérico do yt-dlp | "Não foi possível processar este vídeo. Tente novamente." |

## Script de Build (`postinstall`)

```bash
# scripts/download-bins.sh
# Baixa yt-dlp e ffmpeg Linux estáticos para /bin/
# Executado automaticamente via "postinstall" no package.json
```

Os binários são adicionados ao `.gitignore`. O Vercel executa o `postinstall` antes de cada deploy, garantindo binários sempre atualizados.

## Plataformas Suportadas

| Plataforma | Vídeo | MP3 | Observação |
|---|---|---|---|
| YouTube | ✅ | ✅ | 720p e 1080p |
| TikTok | ✅ | ✅ | Sem marca d'água via yt-dlp |
| Instagram | ✅ | ✅ | Posts e Reels públicos |

## Fora de Escopo

- Contas de usuário / histórico de downloads
- Download de playlists completas
- Vídeos com DRM
- Legendas / closed captions
