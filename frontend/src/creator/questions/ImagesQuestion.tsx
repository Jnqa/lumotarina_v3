import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '../types';
import './ImagesQuestion.css';

type Props = {
  question: Question;
  answer?: string;
  onSelect: (optionId: string) => void;
};

export default function ImagesQuestion({ question, answer, onSelect }: Props) {
  return (
    <div className="options">
      {question.options.map(opt => (
        <RaceOption
          key={opt.id}
          option={opt}
          selected={answer === opt.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}


function RaceOption({
  option,
  selected,
  onSelect
}: {
  option: any;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imagesJson = option.media?.images;

  useEffect(() => {
    // Сбрасываем картинки перед новой загрузкой
    setImages([]);
    if (!imagesJson) return;
    // Фикс для унификации путей
    let fullPath = imagesJson.endsWith('images.json') ? imagesJson : imagesJson + '/images.json';
    const url = fullPath.startsWith('/') ? fullPath : '/' + fullPath;

  fetch(url)
    .then(res => {
      if (!res.ok) {
        // файл не найден или ошибка сервера, просто пропускаем
        return [];
      }
      return res.json().catch(() => []); // если не JSON, возвращаем пустой массив
    })
    .then((files: string[]) => {
      if (!files.length) return;
      const basePath = url.replace('/images.json', '');
      setImages(files.map(f => `${basePath}/${f}`));
    })
    .catch(err => {
      // реально сетевые ошибки
      console.error('Images fetch error:', err);
      setImages([]);
    });
}, [imagesJson]);

  const previewImage =
    option.media?.image ??
    (images.length > 0 ? images[0] : undefined);

    
  return (
    <button
      className={`option ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(option.id)}
    >
        {!selected && (
          <div className="option-row">
            <div className="option-image">
              {previewImage && <img src={previewImage} alt={option.text} />}
            </div>

            <div className="option-text">
              <strong>{option.text}</strong>
              {option.media?.text && (
                <div className="option-desc unselected">{option.media.text}</div>
              )}
            </div>
          </div>
        )}

        {selected && (
        <>
          {images.length > 0 && (
            <div className="option-gallery">
              {images.map(src => (
                <img 
                  key={src} 
                  src={src} 
                  alt="" 
                  onClick={() => setSelectedImage(src)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          )}

          <div className="option-text">
            <strong>{option.text}</strong>
            {option.media?.text && (
              <div className="option-desc">{option.media.text}</div>
            )}
          </div>
        </>
      )}

      {selectedImage && createPortal(
        <div className="image-lightbox" onClick={() => setSelectedImage(null)}>
          <div className="image-lightbox-content" onClick={e => e.stopPropagation()}>
            <button 
              className="image-lightbox-close" 
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
            <img src={selectedImage} alt="" />
          </div>
        </div>,
        document.body
      )}
    </button>
  );
}
