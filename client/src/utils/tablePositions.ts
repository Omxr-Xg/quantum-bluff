// client/src/utils/tablePositions.ts

export function calculatePlayerPositions(
  count: number,
  isMobile = false,
  _isTablet = false
) {
  if (isMobile) {
    // Fixed symmetric positions for vertical table
    // Coordinates relative to center (0,0)
    const positions: { x: number; y: number }[] = [];

    // index 0 = hero (bottom center, hidden on table)
    // index 1 = top center (first visible opponent)
    if (count === 1) {
      positions.push({ x: 0, y: 200 });   // 0: hero
      positions.push({ x: 0, y: -200 });  // 1: top center
    } else if (count === 2) {
      positions.push({ x: 0, y: 200 });   // 0: hero
      positions.push({ x: 0, y: -200 });  // 1: top center
    } else if (count === 3) {
      // Héros en bas ; 2 ennemis aux coins HAUT gauche/droite (loin du plateau / brûlé)
      positions.push({ x: 0, y: 200 }); // hero bottom center
      positions.push({ x: -210, y: -165 }); // left upper — écart ↑ pour éviter le pot / board au centre
      positions.push({ x: 210, y: -165 }); // right upper
    } else if (count === 4) {
      positions.push({ x: 0, y: 200 });    // 0: hero
      positions.push({ x: 0, y: -200 });   // 1: top center
      positions.push({ x: 160, y: -60 });  // 2: top right
      positions.push({ x: -160, y: -60 }); // 3: top left
    } else if (count === 5) {
      positions.push({ x: 0, y: 200 });    // 0: hero bottom
      positions.push({ x: 0, y: -200 }); // 1: top center
      positions.push({ x: -160, y: -80 }); // 2: upper left
      positions.push({ x: 160, y: -80 }); // 3: upper right
      positions.push({ x: -160, y: 80 }); // 4: flank bas-gauche
    } else if (count === 6) {
      positions.push({ x: 0, y: 200 });     // 0: hero
      positions.push({ x: 0, y: -200 });    // 1: top center
      positions.push({ x: 160, y: -100 });  // 2: top right
      positions.push({ x: 160, y: 80 });    // 3: bottom right
      positions.push({ x: -160, y: 80 });   // 4: bottom left
      positions.push({ x: -160, y: -100 }); // 5: top left
    } else {
      /** Nombre de sièges non couvert ci-dessus (ex. 7 max) — ellipse, siège 0 en bas. */
      const rx = 170;
      const ry = 195;
      const startAngle = Math.PI / 2;
      const angleStep = (2 * Math.PI) / count;
      for (let i = 0; i < count; i++) {
        const a = startAngle - i * angleStep;
        positions.push({ x: rx * Math.cos(a), y: ry * Math.sin(a) });
      }
    }

    return positions.map((pos, position) => ({ ...pos, position }));
  }

  // Desktop: original ellipse calculation unchanged
  const radiusX = 451;
  const radiusY = 220;
  const startAngle = Math.PI / 2;
  const angleStep = (2 * Math.PI) / count;

  return Array.from({ length: count }, (_, position) => {
    const angle = startAngle - position * angleStep;
    return {
      x: radiusX * Math.cos(angle),
      y: radiusY * Math.sin(angle),
    };
  });
}
