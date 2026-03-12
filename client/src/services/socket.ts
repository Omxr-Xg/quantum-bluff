import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' 
  ? 'https://votre-domaine.com' 
  : 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false, // On contrôle manuellement la connexion
  withCredentials: true
});
