import { getUserAvatar } from "./userProfile";

// Photos de profil des joueurs
export const playerAvatars: { [key: string]: string } = {
  // Femmes
  'Eve': 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzcyMTA4NjgxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'Alice': 'https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMHdvbWFuJTIwaGVhZHNob3R8ZW58MXx8fHwxNzcyMDU1MTMyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'Sophie': 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc3MjA3MTUzNnww&ixlib=rb-4.1.0&q=80&w=1080',
  'Diana': 'https://images.unsplash.com/photo-1770235622504-3851a96ac6ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGVsZWdhbnQlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzIxNTY5NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  
  // Hommes
  'Bob': 'https://images.unsplash.com/photo-1769636930047-4478f12cf430?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdCUyMGNvbmZpZGVudHxlbnwxfHx8fDE3NzIxNDg1OTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
  'Charlie': 'https://images.unsplash.com/photo-1737574821698-862e77f044c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzc21hbiUyMHBvcnRyYWl0JTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3MjAzMjc5M3ww&ixlib=rb-4.1.0&q=80&w=1080',
  'David': 'https://images.unsplash.com/photo-1764816657425-b3c79b616d14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXN1YWwlMjBtYW4lMjBwb3J0cmFpdCUyMGZyaWVuZGx5fGVufDF8fHx8MTc3MjE1Njg5M3ww&ixlib=rb-4.1.0&q=80&w=1080',
};

// Fonction pour obtenir l'avatar d'un joueur
export function getPlayerAvatar(name: string): string | null {
  // Si c'est le joueur principal ("Vous", "PokerKing47", etc.), utiliser l'avatar du profil
  if (name === "Vous" || name === "PokerKing47" || name === "Diana") {
    return getUserAvatar();
  }
  
  return playerAvatars[name] || null;
}