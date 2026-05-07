import { apiUrl } from '../utils/apiBase';
import { getAuthItem } from '../utils/authStorage';

export interface Tournament {
  id: string;
  name: string;
  buyIn: number;
  prizePool: number;
  maxPlayers: number;
  startTime: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
  visibility?: 'PUBLIC' | 'PRIVATE';
  _count: { players: number };
  isJoined: boolean;
  players?: { userId: string; user: { id: string; username: string; experience: number } }[];
}

export const TournamentService = {
  getTournaments: async (): Promise<Tournament[]> => {
    const token = getAuthItem('token'); // 1. On récupère le token
    
    const res = await fetch(apiUrl('/api/tournaments'), {
      headers: {
        // 2. ON L'ENVOIE ! Sans ça, le serveur te voit comme un inconnu.
        'Authorization': `Bearer ${token}` 
      }
    });
    
    if (!res.ok) throw new Error("Erreur chargement");
    return res.json();
  },

  createTournament: async (data: { name: string; buyIn: number; maxPlayers: number; startTime: string; visibility?: 'PUBLIC' | 'PRIVATE' }) => {
    const res = await fetch(apiUrl('/api/tournaments/create'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthItem('token')}`,
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
    const res = await fetch(apiUrl(`/api/tournaments/${id}/join`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
    return data;
  },

  requestJoinTournament: async (id: string) => {
    const res = await fetch(apiUrl(`/api/tournaments/${id}/request-join`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'envoi de demande");
    return data;
  },

  getReceivedJoinRequests: async () => {
    const res = await fetch(apiUrl('/api/tournaments/requests/received'), {
      headers: {
        'Authorization': `Bearer ${getAuthItem('token')}`,
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur de chargement des demandes");
    return data;
  },

  acceptJoinRequest: async (requestId: string) => {
    const res = await fetch(apiUrl(`/api/tournaments/requests/${requestId}/accept`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'acceptation");
    return data;
  },

  leaveTournament: async (id: string) => {
    const res = await fetch(apiUrl(`/api/tournaments/${id}/leave`), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${getAuthItem('token')}`,
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