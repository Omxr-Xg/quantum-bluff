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

    if (count === 1) {
      positions.push({ x: 0, y: -200 });
    } else if (count === 2) {
      positions.push({ x: 0, y: -200 });
      positions.push({ x: 0, y: 200 });
    } else if (count === 3) {
      positions.push({ x: 0, y: -200 });
      positions.push({ x: 160, y: 0 });
      positions.push({ x: -160, y: 0 });
    } else if (count === 4) {
      positions.push({ x: 0, y: -200 });
      positions.push({ x: 160, y: -60 });
      positions.push({ x: 0, y: 200 });
      positions.push({ x: -160, y: -60 });
    } else if (count === 5) {
      positions.push({ x: 0, y: -200 });
      positions.push({ x: 160, y: -80 });
      positions.push({ x: 160, y: 100 });
      positions.push({ x: -160, y: 100 });
      positions.push({ x: -160, y: -80 });
    } else if (count === 6) {
      positions.push({ x: 0, y: -200 });
      positions.push({ x: 160, y: -100 });
      positions.push({ x: 160, y: 80 });
      positions.push({ x: 0, y: 200 });
      positions.push({ x: -160, y: 80 });
      positions.push({ x: -160, y: -100 });
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
