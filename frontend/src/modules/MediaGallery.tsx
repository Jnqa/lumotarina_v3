import { useState, useRef, useEffect } from "react";
import "./MediaGallery.css";

type VideoItem = { src: string; poster: string; title: string };
type ImageItem = { src: string; title?: string };

type MediaJSON = {
  videos: VideoItem[];
  images: ImageItem[];
};

export default function MediaGallery() {
  const [media, setMedia] = useState<MediaJSON | null>(null);
  const [fullscreen, setFullscreen] = useState<{ src: string; type: 'video' | 'image' } | null>(null);

  const [muted, setMuted] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/media/media.json")
      .then(r => r.json())
      .then(setMedia)
      .catch(console.error);
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setFullscreen(null);
    }
  };

  if (!media) return <div className="media-loading">🎞Загрузка медиа…</div>;

  return (
    <div className="media-gallery">
      <section className="media-section">
        <h2>Видео</h2>
        <div className="media-scroll">
          {media.videos.map((video, i) => (
            <div
              key={i}
              className="media-card"
              onClick={() => 
                setFullscreen({ src: `/media/${video.src}`, type: 'video' })
              }
            >
              <img
                src={`/media/${video.poster}`}
                className="media-thumb"
                alt={video.title}
                loading="lazy"
              />
              <div className="media-title">{video.title}</div>
            </div>
          ))}
        </div>
      </section>

      {media.images.length > 0 && (
        <section className="media-section">
          <h2>Галерея</h2>
          <div className="media-scroll">
            {media.images.map((img, i) => (
              <div
                key={i}
                className="media-card"
                onClick={() => setFullscreen({ src: `/media/${img.src}`, type: 'image' })}
              >
                <img src={`/media/${img.src}`} className="media-thumb" alt={img.title || `Image ${i + 1}`} />
                {img.title && <div className="media-title">{img.title}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {fullscreen && (
        <div className="media-fullscreen fade-in" ref={overlayRef} onClick={handleOverlayClick}>
            {fullscreen.type === 'video' ? (
            <>
                <video
                    className="fullscreen-media fade-in"
                    src={fullscreen.src}
                    autoPlay
                    muted={muted}
                    controls={false}
                    playsInline
                    onEnded={() => setFullscreen(null)}
            />
            {/* Кастомные кнопки */}
            <div className="video-controls fade-in">
                <button
                  className="video-btn"
                  onClick={() => setMuted(prev => !prev)}
                >
                  {muted ? '🔇' : '🔊'}
                </button>
                <button
                  className="video-btn close-btn"
                  onClick={() => setFullscreen(null)}
                >
                  ✖
                </button>
              </div>
            </>
          ) : (
            <img
              className="fullscreen-media fade-in"
              src={fullscreen.src}
              alt=""
            />
          )}
        </div>
      )}
    </div>
  );
}
