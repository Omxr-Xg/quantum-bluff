export const useDeviceType = () => {
  // Simple hook pour déterminer le type d'appareil
  if (typeof window === 'undefined') return 'desktop';
  
  if (window.innerWidth < 640) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
};
