import defaultAvatar from "../../assets/profil.png";

// Clés pour le localStorage
const STORAGE_KEYS = {
  USERNAME: 'quantum_bluff_username',
  EMAIL: 'quantum_bluff_email',
  AVATAR: 'quantum_bluff_avatar',
  BALANCE: 'quantum_bluff_balance',
};

// Interface pour les données utilisateur
export interface UserProfile {
  username: string;
  email: string;
  avatar: string;
  balance: number;
}

// Obtenir le profil utilisateur
export function getUserProfile(): UserProfile {
  const username = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'PokerKing47';
  const email = localStorage.getItem(STORAGE_KEYS.EMAIL) || 'support@QuantumBluff.sxb';
  const avatar = localStorage.getItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
  const balance = parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '6340', 10);

  return {
    username,
    email,
    avatar,
    balance,
  };
}

// Sauvegarder le profil utilisateur
export function saveUserProfile(profile: Partial<UserProfile>): void {
  if (profile.username !== undefined) {
    localStorage.setItem(STORAGE_KEYS.USERNAME, profile.username);
  }
  if (profile.email !== undefined) {
    localStorage.setItem(STORAGE_KEYS.EMAIL, profile.email);
  }
  if (profile.avatar !== undefined) {
    localStorage.setItem(STORAGE_KEYS.AVATAR, profile.avatar);
  }
  if (profile.balance !== undefined) {
    localStorage.setItem(STORAGE_KEYS.BALANCE, profile.balance.toString());
  }
}

// Obtenir uniquement l'avatar de l'utilisateur
export function getUserAvatar(): string {
  return localStorage.getItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
}

// Sauvegarder uniquement l'avatar de l'utilisateur
export function saveUserAvatar(avatar: string): void {
  localStorage.setItem(STORAGE_KEYS.AVATAR, avatar);
}

// Obtenir uniquement le nom d'utilisateur
export function getUsername(): string {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || 'PokerKing47';
}

// Obtenir uniquement le solde
export function getUserBalance(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '6340', 10);
}

// Mettre à jour le solde
export function updateUserBalance(newBalance: number): void {
  localStorage.setItem(STORAGE_KEYS.BALANCE, newBalance.toString());
}
