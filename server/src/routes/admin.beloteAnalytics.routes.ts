import { Router, type Request, type Response } from 'express'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { getBeloteAnalyticsSummary } = await import(
      '../belote/services/beloteAnalytics.service.js'
    )
    const summary = await getBeloteAnalyticsSummary(30)
    return res.json(summary)
  } catch (e) {
    console.error('[adminBeloteAnalytics]', e)
    return res.status(500).json({ error: 'Lecture analytics Belote impossible' })
  }
})

export default router
