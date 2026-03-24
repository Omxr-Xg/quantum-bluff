// client/src/utils/tablePositions.ts
export function calculatePlayerPositions(count: number, isMobile = false, isTablet = false) {
  const tableWidth = isMobile ? 320 : isTablet ? 650 : 950;
  const tableHeight = isMobile ? 180 : isTablet ? 300 : 420;
  const radiusX = tableWidth / 2;
  const radiusY = tableHeight / 2;
  
  const startAngle = Math.PI / 2; 
  const angleStep = (2 * Math.PI) / count; 
  
  const positions = [];

  for (let position = 0; position < count; position++) {
    const angle = startAngle + (position * angleStep);
    const x = radiusX * Math.cos(angle);
    let y = radiusY * Math.sin(angle);
    
    // Décalage pour le joueur principal (en bas)
    if (position === 0) {
      y = y + (isMobile ? 20 : isTablet ? 30 : 40);
    }
    positions.push({ x, y });
  }

  return positions;
}