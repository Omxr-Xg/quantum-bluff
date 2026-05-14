/** Juridictions où l’accès aux jeux d’argent en ligne n’est pas proposé (inscription refusée). */
export const REGISTER_GAMBLING_FORBIDDEN_COUNTRIES = new Set(['SA', 'IR'])

export type RegisterAgeGateCode =
  | 'REGISTER_DATE_INVALID'
  | 'REGISTER_GAMBLING_FORBIDDEN'
  | 'REGISTER_AGE_US_21'
  | 'REGISTER_AGE_MIN_18'

export type RegisterAgeGateResult =
  | { ok: true; dobUtc: Date }
  | { ok: false; code: RegisterAgeGateCode }

export function parseIsoDateOfBirth(raw: string): Date | null {
  const s = raw.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return dt
}

function ageInFullYears(dobUtc: Date, now: Date): number {
  let age = now.getUTCFullYear() - dobUtc.getUTCFullYear()
  const m = now.getUTCMonth() - dobUtc.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < dobUtc.getUTCDate())) {
    age -= 1
  }
  return age
}

function startOfTodayUtc(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/** Premier instant (UTC minuit du jour civil) où l’utilisateur atteint `minLegalYears` années révolues. */
export function eligibilityUnblockAtUtc(dobUtc: Date, minLegalYears: 18 | 21): Date {
  return new Date(
    Date.UTC(dobUtc.getUTCFullYear() + minLegalYears, dobUtc.getUTCMonth(), dobUtc.getUTCDate(), 0, 0, 0, 0),
  )
}

/** `true` si la date du jour (UTC) est strictement avant le jour de `unblockAt` (inscription encore interdite). */
export function isBeforeEligibilityDay(now: Date, unblockAt: Date): boolean {
  return startOfTodayUtc(now) < startOfTodayUtc(unblockAt)
}

/**
 * Vérifie la date de naissance et les règles d’âge selon le pays (ISO2) déduit de l’IP / proxy.
 * - Arabie saoudite, Iran : inscription refusée (jeux d’argent non autorisés).
 * - États-Unis : 21 ans minimum.
 * - Autres pays ou pays inconnu : 18 ans minimum.
 */
export function evaluateRegisterAgeGate(
  dateOfBirthRaw: string,
  countryCode: string | null,
  now: Date = new Date(),
): RegisterAgeGateResult {
  const dobUtc = parseIsoDateOfBirth(dateOfBirthRaw)
  if (!dobUtc) {
    return { ok: false, code: 'REGISTER_DATE_INVALID' }
  }

  const todayStart = startOfTodayUtc(now)
  if (dobUtc.getTime() > todayStart) {
    return { ok: false, code: 'REGISTER_DATE_INVALID' }
  }

  const age = ageInFullYears(dobUtc, now)
  if (age > 120) {
    return { ok: false, code: 'REGISTER_DATE_INVALID' }
  }

  const cc = countryCode?.trim().toUpperCase() ?? ''

  if (cc && REGISTER_GAMBLING_FORBIDDEN_COUNTRIES.has(cc)) {
    return { ok: false, code: 'REGISTER_GAMBLING_FORBIDDEN' }
  }

  if (cc === 'US') {
    if (age < 21) return { ok: false, code: 'REGISTER_AGE_US_21' }
    return { ok: true, dobUtc }
  }

  if (age < 18) {
    return { ok: false, code: 'REGISTER_AGE_MIN_18' }
  }

  return { ok: true, dobUtc }
}
