// client/src/utils/tablePositions.ts

/**
 * Mesures DevTools mobile (430px, 5 joueurs) :
 * - Bot Alpha  right=459 → dépasse 29px à droite
 * - Bot Delta  left=-29  → dépasse 29px à gauche
 * - Centre écran = 215px
 * - Centre Bot Alpha = 459 - 44 = 415px → décalage = 200px
 * - On veut décalage max = 200 - 29 = 171px
 * - Facteur correction radiusX = 171/200 = 0.855
 * - Nouveau radiusX = 528 * 0.855 = 451
 */
export function calculatePlayerPositions(
  count: number,
  isMobile = false,
  _isTablet = false
) {
  const radiusX = isMobile ? 420 : 451;
  const radiusY = isMobile ? 230 : 220;

  const startAngle = Math.PI / 2;
  const angleStep  = (2 * Math.PI) / count;

  return Array.from({ length: count }, (_, position) => {
    const angle = startAngle - position * angleStep;
    return {
      x: radiusX * Math.cos(angle),
      y: radiusY * Math.sin(angle),
    };
  });
}
