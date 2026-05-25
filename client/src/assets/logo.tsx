// Logo Quantum Bluff - Logo personnalisé (poker chip + orbes atomiques)
import logoSrc from "./logo-personnel.png";
/* Avatar par défaut quand l'utilisateur n'a pas choisi de preset ni
 * uploadé de photo — image bundlée par Vite, pas de requête externe. */
import defaultAvatarPng from "./avatars/NA.png";

export const QuantumBluffLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return <img src={logoSrc} className={className} alt="Quantum Bluff" />;
};

// Export logo as data URL for use in img tags
export const logoDataUrl = 'data:image/svg+xml,%3Csvg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23FFD700"/%3E%3Cstop offset="50%25" style="stop-color:%23FFA500"/%3E%3Cstop offset="100%25" style="stop-color:%23FF8C00"/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx="50" cy="50" r="48" stroke="url(%23g)" stroke-width="3" fill="none"/%3E%3Ccircle cx="50" cy="50" r="42" stroke="url(%23g)" stroke-width="1" fill="none" opacity="0.5"/%3E%3Cpath d="M 50 20 Q 65 20 65 35 Q 65 45 55 50 L 60 58 M 45 50 Q 35 45 35 35 Q 35 20 50 20" stroke="url(%23g)" stroke-width="4" stroke-linecap="round" fill="none"/%3E%3Cpath d="M 50 23 L 52 28 L 48 28 Z" fill="url(%23g)" opacity="0.8"/%3E%3Cpath d="M 67 50 L 69 52 L 67 54 L 65 52 Z" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="48" cy="70" r="2" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="52" cy="70" r="2" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="50" cy="67" r="2" fill="url(%23g)" opacity="0.8"/%3E%3Cpath d="M 33 50 Q 31 48 33 46 Q 35 48 33 50 Z" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="50" cy="50" r="15" fill="white" opacity="0.1"/%3E%3Ctext x="50" y="78" font-family="serif" font-size="24" font-weight="bold" fill="url(%23g)" text-anchor="middle"%3EB%3C/text%3E%3C/svg%3E';

// Export as default avatar placeholder (image NA.png bundlée)
export const defaultAvatarUrl: string = defaultAvatarPng;