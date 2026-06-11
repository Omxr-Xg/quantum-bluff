import { Router } from 'express'
import { getPublishedNewsPost, listPublishedNewsPosts } from '../news/news.service.js'
import { newsAssetPath } from '../admin/newsAsset.service.js'

const router = Router()

router.get('/assets/:filename', async (req, res) => {
  const filePath = newsAssetPath(req.params.filename ?? '')
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
              : 'application/octet-stream'
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.type(mime).send(buf)
  } catch {
    return res.status(404).json({ error: 'Asset introuvable' })
  }
})

router.get('/', async (_req, res) => {
  try {
    const articles = await listPublishedNewsPosts()
    return res.json({ articles })
  } catch (e) {
    console.error('[news] list', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/:slug', async (req, res) => {
  try {
    const article = await getPublishedNewsPost(req.params.slug)
    if (!article) return res.status(404).json({ error: 'Article introuvable' })
    return res.json({ article })
  } catch (e) {
    console.error('[news] get', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
