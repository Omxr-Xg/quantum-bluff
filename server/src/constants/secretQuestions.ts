/** Nombre de questions prédéfinies (doit correspondre aux clés i18n côté client). */
export const SECRET_QUESTIONS_COUNT = 10

export function isValidSecretQuestionId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= SECRET_QUESTIONS_COUNT
}
