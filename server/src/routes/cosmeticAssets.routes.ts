import { Router } from 'express'
import { cosmeticAssetPath } from '../admin/cosmeticAsset.service.js'

const router = Router()

router.get('/assets/:filename', async (req, res) => {
  const filePath = cosmeticAssetPath(req.params.filename ?? '')
  if (!filePath) {
    return res.status(400).json({ error: 'Fichier invalide' })
  }
  try {
    const { readFile } = await import('node:fs/promises')
    const buf = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'svg'
                ? 'image/svg+xml'
                : 'application/octet-stream'
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.type(mime).send(buf)
  } catch {
    return res.status(404).json({ error: 'Asset introuvable' })
  }
})

export default router
