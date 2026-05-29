import { useState, useEffect } from 'react';
import type { Option } from '../types';
import EffectPills from './EffectPills';
import ImageCarousel from './ImageCarousel';

interface WorldSelectorProps {
  options: Option[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function WorldSelector({ options, selected, onSelect }: WorldSelectorProps) {
  const [imagesMap, setImagesMap] = useState<Record<string, string[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Load images for all world options
  useEffect(() => {
    const loadedImages: Record<string, string[]> = {};
    const loading: Record<string, boolean> = {};

    options.forEach(async (opt) => {
      if (opt.media?.images && typeof opt.media.images === 'string') {
        loading[opt.id] = true;
        setLoadingMap((prev) => ({ ...prev, [opt.id]: true }));

        try {
          const response = await fetch(opt.media.images);
          const data = await response.json();
          
          let imageList: string[] = [];
          if (Array.isArray(data)) {
            imageList = data;
          } else if (Array.isArray(data.images)) {
            imageList = data.images;
          }

          const baseDir = opt.media.images.substring(0, opt.media.images.lastIndexOf('/'));
          const fullPaths = imageList.map((filename) => {
            if (filename.startsWith('/') || filename.startsWith('http')) {
              return filename;
            }
            return `${baseDir}/${filename}`;
          });

          loadedImages[opt.id] = fullPaths;
        } catch (err) {
          console.error(`Failed to load images for ${opt.id}:`, err);
        } finally {
          setLoadingMap((prev) => ({ ...prev, [opt.id]: false }));
        }
      }
    });

    if (Object.keys(loadedImages).length > 0) {
      setImagesMap(loadedImages);
    }
  }, [options]);

  return (
    <div className="cc-world-options">
      {options.map((opt) => {
        const isLumotar = opt.id === 'lumotar';
        const isNoktar = opt.id === 'noktar';
        const optImages = imagesMap[opt.id] || [];
        const isLoading = loadingMap[opt.id] || false;

        return (
          <div
            key={opt.id}
            className={`cc-world-option ${isLumotar ? 'lumotar' : ''} ${isNoktar ? 'noktar' : ''} ${
              selected === opt.id ? 'selected' : ''
            }`}
            onClick={() => onSelect(opt.id)}
            role="radio"
            aria-checked={selected === opt.id}
            tabIndex={0}
          >
            <h3 className="cc-world-name">{opt.text}</h3>

            {optImages.length > 0 && !isLoading && (
              <ImageCarousel images={optImages} title={opt.text} />
            )}

            {opt.media?.text && (
              <p className="cc-world-desc">{opt.media.text}</p>
            )}

            {opt.media?.badge && (
              <p className="cc-world-theme">{opt.media.badge.label}</p>
            )}

            <EffectPills effects={opt.effects} />
          </div>
        );
      })}
    </div>
  );
}
