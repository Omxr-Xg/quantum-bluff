import bcrypt from 'bcryptjs'

export const ROOM_PASSWORD_MIN = 4
export const ROOM_PASSWORD_MAX = 32

export function roomPasswordErrorMessage(): string {
  return `Mot de passe invalide (${ROOM_PASSWORD_MIN} à ${ROOM_PASSWORD_MAX} caractères)`
}

export async function hashRoomPassword(raw: unknown): Promise<string> {
  const password = typeof raw === 'string' ? raw : ''
  if (password.length < ROOM_PASSWORD_MIN || password.length > ROOM_PASSWORD_MAX) {
    throw new Error(roomPasswordErrorMessage())
  }
  return bcrypt.hash(password, 10)
}

export async function verifyRoomPassword(
  raw: unknown,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return true
  const password = typeof raw === 'string' ? raw : ''
  return bcrypt.compare(password, hash)
}
