const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:3000/api";

export interface Tournament {
  id: string;
  name: string;
  buyIn: number;
  prizePool: number;
  maxPlayers: number;
  startTime: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
  _count: { players: number };
  isJoined: boolean; 
}

export const TournamentService = {
  getTournaments: async (): Promise<Tournament[]> => {
    const token = localStorage.getItem('token'); // 1. On récupère le token
    
    const res = await fetch(`${API_URL}/tournaments`, {
      headers: {
        // 2. ON L'ENVOIE ! Sans ça, le serveur te voit comme un inconnu.
        'Authorization': `Bearer ${token}` 
      }
    });
    
    if (!res.ok) throw new Error("Erreur chargement");
    return res.json();
  },

  createTournament: async (data: { name: string; buyIn: number; maxPlayers: number; startTime: string }) => {
    const res = await fetch(`${API_URL}/tournaments/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Erreur de création");
    return result;
  },

  // ASSURE-TOI QUE CE NOM EST BIEN CELUI-LÀ 👇
  joinTournament: async (id: string) => {
    const res = await fetch(`${API_URL}/tournaments/${id}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
    return data;
  },

  leaveTournament: async (id: string) => {
    const res = await fetch(`${API_URL}/tournaments/${id}/leave`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json' 
      }
    });

    const data = await res.json();

    if (!res.ok) {
      // Cela permet au "catch" de ton composant de récupérer le message du serveur
      throw new Error(data.error || "Erreur lors de l'annulation");
    }

    return data;
  }
};