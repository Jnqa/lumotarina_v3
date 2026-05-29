import { useState, useEffect } from 'react';
import type { Option } from '../types';
import EffectPills from './EffectPills';
import ImageCarousel from './ImageCarousel';

interface OptionProps {
  opt: Option;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function Option({ opt, selected, onSelect }: OptionProps) {
  const badge = opt.media?.badge;
  const hasDesc = !!opt.media?.text;
  const [images, setImages] = useState<string[]>([]);

  // Update images from media - handles both direct array and S3 JSON loading
  useEffect(() => {
    // Case 1: Direct image array
    if (Array.isArray(opt.media?.images)) {
      console.log(`[${opt.id}] Using direct image array:`, opt.media.images);
      setImages(opt.media.images);
      return;
    }

    // Case 2: S3 images-json URL
    if (typeof opt.media?.['images-json'] === 'string') {
      const s3BaseUrl = opt.media['images-json'];
      console.log(`[${opt.id}] Loading images from S3 JSON:`, s3BaseUrl);

      // Construct the JSON URL
      const jsonUrl = s3BaseUrl.endsWith('/') ? s3BaseUrl + 'images.json' : s3BaseUrl + '/images.json';

      fetch(jsonUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((fileList: string[]) => {
          if (!Array.isArray(fileList)) throw new Error('Expected array of filenames');
          
          // Convert filenames to full S3 URLs
          const fullUrls = fileList.map((filename) => {
            const baseUrl = s3BaseUrl.endsWith('/') ? s3BaseUrl : s3BaseUrl + '/';
            return baseUrl + filename;
          });

          console.log(`[${opt.id}] Loaded ${fullUrls.length} images from S3:`, fullUrls);
          setImages(fullUrls);
        })
        .catch((err) => {
          console.error(`[${opt.id}] Failed to load S3 images from ${jsonUrl}:`, err);
          setImages([]);
        });
      return;
    }

    // No images configured
    setImages([]);
  }, [opt.media?.images, opt.media?.['images-json'], opt.id]);

  const hasImages = images.length > 0;

  return (
    <div
      className={`cc-option ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(opt.id)}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
    >
      <div className="cc-option-name">
        <span>{opt.text}</span>
        {badge && (
          <span className="cc-badge">
            <span className="cc-badge-dot" />
            {badge.label}
          </span>
        )}
      </div>
      {hasImages && <ImageCarousel images={images} title={opt.text} />}
      {hasDesc && opt.media && <p className="cc-option-desc">{opt.media.text}</p>}
      <EffectPills effects={opt.effects} />
    </div>
  );
}
