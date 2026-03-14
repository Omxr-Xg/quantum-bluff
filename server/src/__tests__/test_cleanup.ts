// __tests__/test_cleanup.ts
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function testCleanup() {
  console.log("🧪 Début du test DA4 (Nettoyage des archives)...");

  const fortyDaysAgo = new Date();
  fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

  try {
    // 1. Création d'une donnée de test dans GameHistory
    const oldHistory = await prisma.gameHistory.create({
      data: {
        tableId: "test-table",
        gameId: "test-game-123",
        board: ["Ah", "Ks"],
        pot: 500,
        createdAt: fortyDaysAgo,
      }
    });
    console.log(`✅ Historique de test créé (ID: ${oldHistory.id})`);

    // 2. Logique de suppression
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.gameHistory.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo }
      }
    });

    console.log(`🧹 Nettoyage effectué : ${deleted.count} entrées supprimées.`);

    // 3. Vérification
    const check = await prisma.gameHistory.findUnique({ where: { id: oldHistory.id } });
    if (!check) {
      console.log("🎉 Succès : Les vieilles données ont été purgées !");
    } else {
      console.log("❌ Échec : La donnée est toujours présente.");
    }

  } catch (error) {
    console.error("💥 Erreur pendant le test :", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCleanup();