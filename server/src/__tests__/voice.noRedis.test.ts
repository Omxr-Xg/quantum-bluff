import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const voiceDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../voice',
)

function listTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listTsFiles(full))
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

const VOICE_REDIS_ALLOWED = new Set(['voiceCallStore.ts'])

describe('voice module must not use Redis', () => {
  it('seul voiceCallStore.ts peut importer redis/ioredis', () => {
    const forbidden = [/redis\.config/, /from ['"]ioredis['"]/, /upstash/i]
    const files = listTsFiles(voiceDir)
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const base = path.basename(file)
      if (VOICE_REDIS_ALLOWED.has(base)) continue
      const src = fs.readFileSync(file, 'utf8')
      for (const pattern of forbidden) {
        expect(src).not.toMatch(pattern)
      }
    }
  })
})
