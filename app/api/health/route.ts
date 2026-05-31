import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { BIN_PATH } from '@/lib/ytdlp'

function runVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(BIN_PATH, ['--version'], { timeout: 10_000 })
    let out = ''
    proc.stdout!.on('data', (d: Buffer) => { out += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`exit ${code}`))
      else resolve(out.trim())
    })
    proc.on('error', reject)
  })
}

export async function GET() {
  const binExists = existsSync(BIN_PATH)
  let version: string | null = null
  let versionError: string | null = null

  if (binExists) {
    try {
      version = await runVersion()
    } catch (e) {
      versionError = e instanceof Error ? e.message : String(e)
    }
  }

  return NextResponse.json({
    binPath: BIN_PATH,
    binExists,
    version,
    versionError,
  })
}
