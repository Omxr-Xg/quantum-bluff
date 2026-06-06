import logoSrc from "./logo-personnel.webp";

export const QuantumBluffLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return <img src={logoSrc} className={className} alt="Quantum Bluff" />;
};
