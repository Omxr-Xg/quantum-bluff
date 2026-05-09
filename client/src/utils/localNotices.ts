/** Notices affichées dans le centre de notifications (cloche), sans persistance serveur. */

export const LOCAL_NOTICE_ADD_EVENT = 'qb-local-notice-add'
export const LOCAL_NOTICE_REMOVE_EVENT = 'qb-local-notice-remove'

export const FREE_RECHARGE_BALANCE_NOTICE_ID = 'free-recharge-balance'

export const FREE_RECHARGE_COOLDOWN_NOTICE_ID = 'free-recharge-cooldown'

export type LocalNoticePayload = {
  id: string
  title: string
  body: string
}

export function dispatchLocalNotice(payload: LocalNoticePayload): void {
  window.dispatchEvent(new CustomEvent(LOCAL_NOTICE_ADD_EVENT, { detail: payload }))
}

export function clearLocalNotice(id: string): void {
  window.dispatchEvent(new CustomEvent(LOCAL_NOTICE_REMOVE_EVENT, { detail: { id } }))
}
