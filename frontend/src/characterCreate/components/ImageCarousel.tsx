import { useRef } from 'react';

interface ImageCarouselProps {
  images: string[];
  title?: string;
}

export default function ImageCarousel({ images, title }: ImageCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const imageWidth = container.querySelector('img')?.offsetWidth || 120;
    const gap = 8;
    const scrollAmount = (imageWidth + gap) * 2; // Scroll 2 images at a time
    
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="cc-image-gallery">
      {images.length > 5 && (
        <button
          className="cc-gallery-btn cc-gallery-btn-left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>
      )}
      
      <div className="cc-gallery-container" ref={scrollContainerRef}>
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`${title || 'Image'} ${idx + 1}`}
            className="cc-gallery-image"
          />
        ))}
      </div>

      {images.length > 5 && (
        <button
          className="cc-gallery-btn cc-gallery-btn-right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      )}
    </div>
  );
}
