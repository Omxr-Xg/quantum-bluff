import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';

const router = express.Router();

// Inscription
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        stats: { create: {} }
      }
    });
    
    res.json({ id: user.id, email: user.email, username: user.username });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Chercher l'utilisateur dans la base
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    res.json({ id: user.id, email: user.email, username: user.username });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;