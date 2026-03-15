export class AntiCheatMonitor {
  private actionHistory: Map<string, number[]> = new Map()
  private readonly maxActions: number
  private readonly windowMs: number

  constructor(maxActions = 8, windowMs = 3000) {
    this.maxActions = maxActions
    this.windowMs = windowMs
  }

  registerAction(userId: string): { suspicious: boolean; count: number } {
    const now = Date.now()
    const history = this.actionHistory.get(userId) || []

    const recentHistory = history.filter((timestamp) => now - timestamp <= this.windowMs)
    recentHistory.push(now)

    this.actionHistory.set(userId, recentHistory)

    return {
      suspicious: recentHistory.length > this.maxActions,
      count: recentHistory.length
    }
  }

  clearUser(userId: string) {
    this.actionHistory.delete(userId)
  }
}