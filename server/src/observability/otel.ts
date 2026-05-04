import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { env } from '../config/env.js'
import { rootLogger } from './logger.js'

let sdk: NodeSDK | null = null

function tracesEndpoint(): string | undefined {
  const explicit = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  if (!base) return undefined
  const b = base.replace(/\/$/, '')
  if (b.endsWith('/v1/traces')) return b
  return `${b}/v1/traces`
}

export function initOtel(): void {
  if (env.isJest) return

  const url = tracesEndpoint()
  if (!url) return

  const serviceName =
    process.env.OTEL_SERVICE_NAME?.trim() || 'quantum-bluff-api'

  try {
    sdk = new NodeSDK({
      resource: resourceFromAttributes({
        'service.name': serviceName,
        'deployment.environment': env.nodeEnv,
        'service.instance.id': env.instanceId,
      }),
      traceExporter: new OTLPTraceExporter({ url }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    })
    sdk.start()
    rootLogger.info({ msg: 'otel_sdk_started', tracesEndpoint: url, serviceName })
  } catch (err) {
    rootLogger.warn({
      msg: 'otel_sdk_start_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function shutdownOtel(): Promise<void> {
  if (!sdk) return
  try {
    await sdk.shutdown()
    rootLogger.info({ msg: 'otel_sdk_shutdown' })
  } catch (err) {
    rootLogger.warn({
      msg: 'otel_sdk_shutdown_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  } finally {
    sdk = null
  }
}
