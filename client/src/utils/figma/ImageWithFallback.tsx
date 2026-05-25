import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
}

export const ImageWithFallback = ({ src, alt, className }: ImageWithFallbackProps) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div className={`bg-gray-700 flex items-center justify-center ${className}`}>
        <span className="text-white text-xl">{alt.charAt(0)}</span>
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
    />
  );
};
