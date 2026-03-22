# Tests backend poker — lecture

Une suite volumineuse **réduit fortement** le risque de régression et documente le comportement attendu.

**Ce que les tests ne garantissent pas :**

- Une preuve mathématique que le moteur est « 100 % correct » pour toutes les parties possibles.
- L’absence de bugs dans les chemins non couverts ou les intégrations (HTTP, Socket.IO, Prisma).

**Ce qu’ils garantissent pratiquement :**

- Les invariants testés (pots, blinds, relances min, ordres de mains, sièges cash) restent vrais tant que les tests passent après chaque changement.

Pour des scénarios métier très précis (ex. split pot avec side pot), fournir **tableau attendu** (mises → stacks finaux) aide à verrouiller le comportement.
