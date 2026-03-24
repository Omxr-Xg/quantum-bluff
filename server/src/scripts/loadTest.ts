import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_URL = 'http://localhost:3000';
const MAX_CLIENTS = 100; // Objectif de notre test 
const INTERVAL_MS = 25; // Créer un joueur toutes les 25ms

let clientsConnected = 0;

console.log(`🚀 Démarrage du test de charge : Objectif ${MAX_CLIENTS} joueurs simultanés...`);

const createClient = (id: number) => {
  const userId = `load_test_user_${id}`;
  
  // On génère un vrai token JWT pour passer la sécurité de ta Gateway
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'quantum_bluff_secret');

  const socket = io(TARGET_URL, {
    auth: { token },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    clientsConnected++;
    console.log(`[Joueur Virtuel ${id}] 🟢 Connecté. Total sur le serveur : ${clientsConnected}/${MAX_CLIENTS}`);
  });

  socket.on('disconnect', () => {
    clientsConnected--;
  });
};

let currentId = 1;
const interval = setInterval(() => {
  createClient(currentId++);
  if (currentId > MAX_CLIENTS) {
    clearInterval(interval);
    console.log('✅ 100 requêtes envoyées ! Observez le terminal de votre serveur (npm run dev) pour vérifier que le monitoring fonctionne.');
  }
}, INTERVAL_MS);
