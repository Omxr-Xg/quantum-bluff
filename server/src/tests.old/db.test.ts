import { creditWinner, debitPlayer, logHand, closeDB, HandSummary, prisma } from "../services/db.service";
// Note : On retire "import { PrismaClient } from '@prisma/client'" 
// et on retire "const prisma = new PrismaClient()"

let testUserId: string;

describe("User transactions and game history", () => {
  // Le reste du code reste identique, il utilisera le 'prisma' importé
  beforeAll(async () => {
    
    // Nettoyer les anciens utilisateurs de test
    await prisma.gameHistory.deleteMany({});
    await prisma.userStats.deleteMany({});
    await prisma.user.deleteMany({});

    const user = await prisma.user.create({
      data: {
        username: "testuser",
        email: "testuser@test.com",
        password: "testpassword",
        chips: 1000,
        level: 1,
        stats: {
          create: {
            wins: 0,
            totalGames: 0,
            biggestPot: 0,
          },
        },
      },
      include: { stats: true },
    });

    testUserId = user.id;
  });

  // --- Test 1 : email unique ---
  test("should not allow duplicate email", async () => {
    await expect(
      prisma.user.create({
        data: {
          username: "testuser",
          email: "testuser@test.com",
          password: "anotherpass",
          chips: 1000,
          level: 1,
        },
      })
    ).rejects.toThrow();
  });

  // --- Test 2 : fonds insuffisants ---
  test("should not allow negative chips via debitPlayer", async () => {
    await expect(debitPlayer(testUserId, 5000)).rejects.toThrow("Fonds insuffisants");
  });

  // --- Test 3 : créditer le gagnant ---
  test("creditWinner should correctly add chips", async () => {
    const before = await prisma.user.findUnique({ where: { id: testUserId } });
    await creditWinner(testUserId, 500);
    const after = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(after!.chips).toBe(before!.chips + 500);
  });

  // --- Test 4 : débiter si fonds suffisants ---
  test("debitPlayer should subtract chips if funds are sufficient", async () => {
    const before = await prisma.user.findUnique({ where: { id: testUserId } });
    await debitPlayer(testUserId, 200);
    const after = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(after!.chips).toBe(before!.chips - 200);
  });

  // --- Test 5 : logHand ---
  test("logHand should create a game history entry", async () => {
    const hand: HandSummary = {
      tableId: "table123",
      gameId: "game123",
      board: ["Ah", "Kd", "Qs"],
      winnerId: testUserId,
      pot: 500, // champ obligatoire
    };

    await logHand(hand);

    const history = await prisma.gameHistory.findFirst({
      where: { tableId: hand.tableId, gameId: hand.gameId },
    });

    expect(history).not.toBeNull();
    expect(history?.winnerId).toBe(testUserId);
    expect(history?.board).toEqual(hand.board);
    expect(history?.pot).toBe(hand.pot);
  });

  // --- Cleanup après tests ---
  afterAll(async () => {
    await prisma.gameHistory.deleteMany({});
    await prisma.userStats.deleteMany({});
    await prisma.user.deleteMany({});
    await closeDB();
  });
});
