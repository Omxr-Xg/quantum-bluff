import { rootLogger } from './logger.js'

/**
 * Événement métier / ops avec `msg` snake_case stable (voir Docs/OBSERVABILITY.md).
 */
export function logBusinessEvent(
  payload: Record<string, unknown> & { msg: string }
): void {
  rootLogger.info(payload)
}
