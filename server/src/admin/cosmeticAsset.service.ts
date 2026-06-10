import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_BYTES = 800_000
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])

const uploadsRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/cosmetic-assets')

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const m = /^data:([\w/+.-]+);base64,(.*)$/i.exec(dataUrl.trim())
  if (!m) return null
  const mime = m[1]!.toLowerCase()
  if (!ALLOWED_MIME.has(mime)) return null
  try {
    const buffer = Buffer.from(m[2]!, 'base64')
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return null
    return { buffer, mime }
  } catch {
    return null
  }
}

export class CosmeticAssetError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function saveCosmeticAssetFromDataUrl(dataUrl: string): Promise<{ url: string; filename: string }> {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) {
    throw new CosmeticAssetError(400, 'Image invalide (JPEG, PNG, GIF, WebP, SVG — max 800 Ko)')
  }
  await mkdir(uploadsRoot, { recursive: true })
  const filename = `${randomUUID()}.${extForMime(parsed.mime)}`
  const fullPath = path.join(uploadsRoot, filename)
  await writeFile(fullPath, parsed.buffer)
  return { url: `/api/cosmetics/assets/${filename}`, filename }
}

export function cosmeticAssetPath(filename: string): string | null {
  const safe = path.basename(filename)
  if (safe !== filename || safe.includes('..')) return null
  return path.join(uploadsRoot, safe)
}
