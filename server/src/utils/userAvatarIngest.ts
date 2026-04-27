/**
 * Ingère une valeur déjà passée par sanitizePublicAvatarUrl : data URL ou http(s),
 * produit un buffer + type MIME pour stockage PostgreSQL (BYTEA).
 */
const MAX_BYTES = 1_500_000
const FETCH_TIMEOUT_MS = 12_000

const MIME_FROM_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.toString('ascii', 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (buf.length >= 6) {
    const g = buf.toString('ascii', 0, 6)
    if (g === 'GIF87a' || g === 'GIF89a') return 'image/gif'
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  const head = buf.toString('utf8', 0, Math.min(256, buf.length)).trimStart().toLowerCase()
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml'
  return null
}

function parseDataUrl(s: string): { buffer: Buffer; mime: string } | null {
  const m = /^data:([\w/+.-]+);base64,(.*)$/i.exec(s)
  if (!m) return null
  const mime = m[1]!.toLowerCase()
  if (!mime.startsWith('image/')) return null
  try {
    const buffer = Buffer.from(m[2]!, 'base64')
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return null
    const sniffed = sniffMime(buffer)
    if (!sniffed && mime !== 'image/svg+xml') return null
    return { buffer, mime: sniffed ?? mime }
  } catch {
    return null
  }
}

function guessMimeFromUrl(url: string, contentType: string | null): string | null {
  const ct = contentType?.split(';')[0]?.trim().toLowerCase()
  if (ct && ct.startsWith('image/')) return ct
  try {
    const path = new URL(url).pathname.toLowerCase()
    const dot = path.lastIndexOf('.')
    if (dot >= 0) {
      const ext = path.slice(dot + 1)
      return MIME_FROM_EXT[ext] ?? null
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function ingestAvatarToBuffer(sanitized: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (sanitized.startsWith('data:')) {
    return parseDataUrl(sanitized)
  }

  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(sanitized, {
        signal: ac.signal,
        redirect: 'follow',
        headers: { Accept: 'image/*,*/*;q=0.8' },
      })
      if (!res.ok) return null
      const arr = new Uint8Array(await res.arrayBuffer())
      if (arr.byteLength === 0 || arr.byteLength > MAX_BYTES) return null
      const buffer = Buffer.from(arr)
      const mime = guessMimeFromUrl(sanitized, res.headers.get('content-type')) ?? sniffMime(buffer)
      if (!mime || !mime.startsWith('image/')) return null
      return { buffer, mime }
    } catch {
      return null
    } finally {
      clearTimeout(t)
    }
  }

  return null
}

export function canonicalStoredAvatarPath(userId: string): string {
  return `/api/auth/avatars/${userId}`
}

/** UUID v4 pour param route */
export function isUuidParam(id: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id)
}
