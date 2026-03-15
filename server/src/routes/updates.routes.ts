import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import express from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()
const updatesDir = path.join(__dirname, '../../updates')

router.use('/updates', express.static(updatesDir))

router.get('/updates/latest', (_req, res) => {
  try {
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true })
      return res.json({ version: null, message: 'Aucune mise à jour disponible' })
    }

    const files = fs.readdirSync(updatesDir).filter(f => f.endsWith('.exe'))
    const versions = files.map(f => {
      const match = f.match(/Setup ([\d.]+)\.exe/)
      return match ? match[1] : null
    }).filter((v): v is string => v !== null)

    versions.sort((a, b) => {
      const aParts = a.split('.').map(Number)
      const bParts = b.split('.').map(Number)
      for (let i = 0; i < 3; i++) {
        if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i]
      }
      return 0
    })

    if (versions.length === 0) {
      return res.json({ version: null, message: 'Aucune mise à jour disponible' })
    }

    const latest = versions[0]
    res.json({ version: latest, file: `Quantum Bluff Setup ${latest}.exe` })
  } catch {
    res.status(500).json({ error: 'Erreur lecture des versions' })
  }
})

export default router
