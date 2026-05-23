/**
 * Reads PrismaClientKnownRequestError.code when present (schema drift, missing migrations).
 */
export function prismaKnownRequestCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { name?: string; code?: string };
  if (e.name === 'PrismaClientKnownRequestError' && typeof e.code === 'string') {
    return e.code;
  }
  return null;
}
