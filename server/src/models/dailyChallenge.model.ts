export interface DailyChallenge {
  userId: string;
  date: string; // "2026-03-28"
  challenges: {
    id: number;
    progress: number;
    goal: number;
    completed: boolean;
  }[];
}