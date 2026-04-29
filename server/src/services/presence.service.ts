const onlineUsers = new Set<string>();

export function markUserOnline(userId: string): void {
  onlineUsers.add(userId);
}

export function markUserOffline(userId: string): void {
  onlineUsers.delete(userId);
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}
