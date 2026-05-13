/**
 * Suivi global de la conversation amie actuellement ouverte (Friends.tsx).
 *
 * Pourquoi pas se baser sur l'URL ? `Layout` et `NotificationCenter` consomment
 * des messages via socket dans des handlers qui lisent `window.location` au
 * moment de l'événement : si l'URL n'est pas (encore) synchronisée — ou si le
 * routeur remplace les params en `{replace: true}` avec un léger délai —
 * la notif se déclenche alors que l'utilisateur est déjà sur la conversation.
 *
 * Ce module expose :
 *  - `setActiveFriendChat(id | null)` : déclaré par `Friends.tsx` au mount / au
 *    changement de conversation / au unmount.
 *  - `getActiveFriendChat()` : lecture synchrone (consommée par les handlers
 *    socket Layout / NotificationCenter).
 *  - `notifyFriendChatReplied(id)` : déclaré par `Friends.tsx` après un send
 *    réussi → efface l'éventuelle notif (Layout) + l'unread (bell) du sender,
 *    car « j'ai répondu, plus besoin de me rappeler ce DM ».
 */

let activeFriendId: string | null = null

export const ACTIVE_FRIEND_CHAT_CHANGED_EVENT = 'qb-active-friend-chat-changed'
export const FRIEND_CHAT_REPLIED_EVENT = 'qb-friend-chat-replied'

export function setActiveFriendChat(friendId: string | null): void {
  const next = friendId && friendId.length > 0 ? friendId : null
  if (next === activeFriendId) return
  activeFriendId = next
  window.dispatchEvent(
    new CustomEvent(ACTIVE_FRIEND_CHAT_CHANGED_EVENT, { detail: { friendId: next } }),
  )
}

export function getActiveFriendChat(): string | null {
  return activeFriendId
}

/** À appeler après un envoi de message réussi : efface notif top + unread bell pour `friendId`. */
export function notifyFriendChatReplied(friendId: string): void {
  if (!friendId) return
  window.dispatchEvent(
    new CustomEvent(FRIEND_CHAT_REPLIED_EVENT, { detail: { friendId } }),
  )
}
