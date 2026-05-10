/** Doit être importé en tout premier dans `index.ts` (effet de bord avant Express / ioredis). */
import { initOtel } from './otel.js'

initOtel()
