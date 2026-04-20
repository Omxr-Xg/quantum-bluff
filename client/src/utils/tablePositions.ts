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
      positions.push({ x: 0, y: -200 });  // 0: top center
      positions.push({ x: 160, y: 0 });   // 1: right
      positions.push({ x: -160, y: 0 });  // 2: left
    } else if (count === 4) {
      positions.push({ x: 0, y: 200 });    // 0: hero
      positions.push({ x: 0, y: -200 });   // 1: top center
      positions.push({ x: 160, y: -60 });  // 2: top right
      positions.push({ x: -160, y: -60 }); // 3: top left
    } else if (count === 5) {
      positions.push({ x: 0, y: -200 });   // 0: top center
      positions.push({ x: 160, y: -80 });  // 1: top right
      positions.push({ x: 160, y: 100 });  // 2: bottom right
      positions.push({ x: -160, y: 100 }); // 3: bottom left
      positions.push({ x: -160, y: -80 }); // 4: top left
    } else if (count === 6) {
      positions.push({ x: 0, y: 200 });     // 0: hero
      positions.push({ x: 0, y: -200 });    // 1: top center
      positions.push({ x: 160, y: -100 });  // 2: top right
      positions.push({ x: 160, y: 80 });    // 3: bottom right
      positions.push({ x: -160, y: 80 });   // 4: bottom left
      positions.push({ x: -160, y: -100 }); // 5: top left
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
