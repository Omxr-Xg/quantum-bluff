import { defaultChallenges } from "../data/dailyChallenges";

const store = new Map<string, any>();

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 
 */
export function getUserChallenges(userId: string) {
  const key = `${userId}-${getToday()}`;

  if (!store.has(key)) {
    const newChallenges = defaultChallenges.map((c) => {
      let progress = 0;
  
      // 🔥 TEST: challenge #1 completed başlasın
      if (c.id === 1) {
        progress = c.goal;
      }
  
      return {
        id: c.id,
        goal: c.goal,
        progress,
        completed: progress >= c.goal,
        claimed: false,
      };
    });
  
    store.set(key, {
      userId,
      date: getToday(),
      challenges: newChallenges,
    });
  }

  return store.get(key);
}

/**
 * 🎯 Progress update 
 */
export function updateChallenge(
  userId: string,
  challengeId: number,
  value: number
) {
  const data = getUserChallenges(userId);

  const challenge = data.challenges.find(
    (c: any) => c.id === challengeId
  );

  if (!challenge) return;

  challenge.progress += value;

  if (challenge.progress >= challenge.goal) {
    challenge.progress = challenge.goal; // overflow engelle
    challenge.completed = true;
  }
}

/**
 * 🎯 Reward claim
 */
export function claimReward(userId: string, challengeId: number) {
  const data = getUserChallenges(userId);

  const challenge = data.challenges.find(
    (c: any) => c.id === challengeId
  );

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  if (!challenge.completed) {
    throw new Error("Challenge not completed");
  }

  if (challenge.claimed) {
    throw new Error("Already claimed");
  }

  // 
  const reward = {
    xp: 50,
    chips: 100,
  };

  // mark as claimed
  challenge.claimed = true;

  console.log(
    `🎉 User ${userId} claimed reward for challenge ${challengeId}`
  );

  return reward;
}

// 🔥 TEMP TEST
updateChallenge("1", 1, 3);