import { useState, useEffect } from 'react';
import type { City } from '../types';
// import EffectPills from './EffectPills';

interface CitySelectorProps {
  city: City;
  selected: boolean;
  onSelect: (id: string) => void;
  description?: string;
}

export default function CitySelector({
  city,
  selected,
  onSelect,
  description,
}: CitySelectorProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [city.id]);

  const currentImage = city.images?.[currentImageIndex];

  /* Unused - images auto-cycle through scroll
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? (city.images?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === (city.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };
  */

  return (
    <div
      className={`cc-city-option ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(city.id)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
    >
      {/* Images carousel */}
      {city.images && city.images.length > 0 && (
        <div className="cc-city-images">
          <div className="cc-city-image-carousel">
            {currentImage && (
              <img
                src={currentImage}
                alt={city.name}
                className="cc-city-image"
                loading="lazy"
              />
            )}
          </div>
          {city.images.length > 1 && (
            <div className="cc-city-image-nav" style={{ position: 'absolute', bottom: 4, width: '100%' }}>
              {city.images.map((_, idx) => (
                <div
                  key={idx}
                  className={`cc-city-image-dot ${idx === currentImageIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* City info */}
      <div className="cc-city-info">
        <div>
          <div className="cc-city-name">{city.name}</div>
          <div className="cc-city-desc">{description || city.name}</div>
        </div>
      </div>
    </div>
  );
}
