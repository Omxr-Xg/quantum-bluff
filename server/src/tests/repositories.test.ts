import { UserRepository } from "../repositories/user.repository";
import { GameHistoryRepository } from "../repositories/gameHistory.repository";
import { prisma } from "../services/db.service";

describe("Repositories Integration Tests", () => {
  let userId: string;

  beforeAll(async () => {
    // Nettoyage
    await prisma.gameHistory.deleteMany();
    await prisma.user.deleteMany();

    // Création d'un utilisateur via le repo
    const user = await UserRepository.create({
      username: "RepoTester",
      email: "repo@test.com",
      password: "hashed_password",
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("UserRepository", () => {
    test("static credit() should increment chips", async () => {
      await UserRepository.credit(userId, 500);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.chips).toBe(1500); // 1000 (default) + 500
    });

    test("static debit() transaction should fail if insufficient funds", async () => {
      // On tente de débiter 3000 alors qu'il n'en a que 1500
      await expect(UserRepository.debit(userId, 3000)).rejects.toThrow("Fonds insuffisants");
    });

    test("static debit() should work if funds are OK", async () => {
      await UserRepository.debit(userId, 200);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.chips).toBe(1300); // 1500 - 200
    });
  });

  describe("GameHistoryRepository", () => {
    test("static logHand() should persist history", async () => {
      const hand = {
        tableId: "table-repo",
        gameId: "game-repo",
        board: ["Ad", "As"],
        pot: 1000,
        winnerId: userId,
      };

      const entry = await GameHistoryRepository.logHand(hand);
      expect(entry.tableId).toBe("table-repo");
      expect(entry.winnerId).toBe(userId);
    });
  });
});
