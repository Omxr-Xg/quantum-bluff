import express from "express";
import {
  getUserChallenges,
  updateChallenge,
} from "../services/dailyChallenge.service";

const router = express.Router();

/**
 * GET 
 */
router.get("/:userId", (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const data = getUserChallenges(userId);
  res.json(data);
});

/**
 * POST — Challenge progress update 
 */
router.post("/update", (req, res) => {
  const { userId, challengeId, value } = req.body;

  if (!userId || !challengeId) {
    return res.status(400).json({ error: "Missing params" });
  }

  updateChallenge(userId, challengeId, value || 1);

  res.json({ success: true });
});

/**
 * 🎯 POST — Claim reward
 */
router.post("/claim", (req, res) => {
  const { userId, challengeId } = req.body;

  if (!userId || !challengeId) {
    return res.status(400).json({ error: "Missing params" });
  }

  const data = getUserChallenges(userId);

  const challenge = data.challenges.find(
    (c: any) => c.id === challengeId
  );

  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  if (!challenge.completed) {
    return res.status(400).json({ error: "Challenge not completed" });
  }

  if (challenge.claimed) {
    return res.status(400).json({ error: "Already claimed" });
  }

  
  console.log(
    `🎉 User ${userId} claimed reward for challenge ${challengeId}`
  );

  
  challenge.claimed = true;

  res.json({
    success: true,
    reward: {
      xp: 50,
      chips: 100,
    },
  });
});

export default router;