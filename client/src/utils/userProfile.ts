const defaultAvatar = 'https://ui-avatars.com/api/?name=QB&background=10b981&color=fff&size=128';

const STORAGE_KEYS = {
  USERNAME: 'quantum_bluff_username',
  EMAIL: 'quantum_bluff_email',
  AVATAR: 'quantum_bluff_avatar',
  BALANCE: 'quantum_bluff_balance',
};

export interface UserProfile {
  username: string;
  email: string;
  avatar: string;
  balance: number;
}

export function getUserProfile(): UserProfile {
  const username = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'PokerKing47';
  const email = localStorage.getItem(STORAGE_KEYS.EMAIL) || 'support@QuantumBluff.sxb';
  const avatar = localStorage.getItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
  const raw = parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '6340', 10);
  const balance = Number.isNaN(raw) ? 0 : Math.max(0, raw);

  return { username, email, avatar, balance };
}

export function saveUserProfile(profile: Partial<UserProfile>): void {
  if (profile.username) localStorage.setItem(STORAGE_KEYS.USERNAME, profile.username);
  if (profile.email) localStorage.setItem(STORAGE_KEYS.EMAIL, profile.email);
  if (profile.avatar) localStorage.setItem(STORAGE_KEYS.AVATAR, profile.avatar);
  if (profile.balance !== undefined) localStorage.setItem(STORAGE_KEYS.BALANCE, Math.max(0, profile.balance).toString());
}

export function getUserAvatar(): string {
  return localStorage.getItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
}

export function saveUserAvatar(avatar: string): void {
  localStorage.setItem(STORAGE_KEYS.AVATAR, avatar);
}

export function getUsername(): string {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || 'PokerKing47';
}

export function getUserBalance(): number {
  const n = parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '6340', 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export function updateUserBalance(newBalance: number): void {
  const safe = Math.max(0, Math.floor(newBalance));
  localStorage.setItem(STORAGE_KEYS.BALANCE, safe.toString());
}

/** Add amount to current balance and persist. Returns new balance. */
export function addToUserBalance(amount: number): number {
  const current = getUserBalance();
  const next = Math.max(0, current + amount);
  updateUserBalance(next);
  return next;
}
