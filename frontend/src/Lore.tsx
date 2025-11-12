import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Lore.css';

type IndexManifest = {
  poi: string[];
  buildings: string[];
  characters: string[];
  clippings: string[];
  timeline: string[];
};

function simpleMarkdownToHtml(md: string) {
  // Very small lightweight renderer: headings, bold, italics, links, code blocks, paragraphs, lists
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // code fences
  html = html.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre><code>${code}</code></pre>`);
  // headings
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  // bold/italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // unordered lists
  html = html.replace(/^[-\*] (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)(?![\s\S]*?<li>)/g, (m) => `<ul>${m}</ul>`);
  // paragraphs (simple)
  html = html.replace(/^(?!<h|<ul|<pre|<li|<blockquote)([^\n][^\n]+)$/gm, '<p>$1</p>');
  // line breaks
  html = html.replace(/\n/g, '\n');
  return html;
}

export default function Lore() {
  const [manifest, setManifest] = useState<IndexManifest | null>(null);
  const [active, setActive] = useState<'poi' | 'buildings' | 'characters' | 'clippings' | 'timeline'>('poi');
  const [contentHtml, setContentHtml] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const nav = useNavigate();
  const [images, setImages] = useState<string[] | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    fetch('/lore/index.json')
      .then((r) => {
        if (!r.ok) throw new Error('no manifest');
        return r.json();
      })
      .then((j) => setManifest(j))
      .catch(() => {
        // fallback: empty manifest
        setManifest({ poi: [], buildings: [], characters: [], clippings: [], timeline: [] });
      });
  }, []);

  function openFile(category: string, filename: string) {
    setContentHtml(null);
    setTitle(filename);
    const enc = encodeURIComponent(filename);
    const tryPath = (p: string) =>
      fetch(p).then(async (r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        const text = await r.text();
        // Vite (or the dev server) may return index.html (spa fallback) with text/html
        if (ct.includes('text/html') || text.trim().toLowerCase().startsWith('<!doctype html')) {
          throw new Error('not-found-html');
        }
        if (!r.ok) throw new Error('failed');
        return text;
      });

  const primary = `/lore/${category}/${enc}`;
    const fallback = `/lore/${category}/${filename}`;

    tryPath(primary)
      .catch((err) => {
        // if dev-server returned html fallback, try unencoded filename as fallback
        if (err && err.message === 'not-found-html') {
          return tryPath(fallback);
        }
        // otherwise propagate
        throw err;
      })
      .then((md) => {
        setContentHtml(simpleMarkdownToHtml(md));
        // try to load images manifest for this item: /lore/{category}/{baseName}/images.json
        const base = filename.replace(/\.md$/i, '');
        const encBase = encodeURIComponent(base);
        fetch(`/lore/${category}/${encBase}/images.json`).then(r => {
          if (!r.ok) throw new Error('no images');
          return r.json();
        }).then((arr: string[]) => {
          // map to full paths
          const paths = arr.map((n) => `/lore/${category}/${encBase}/${n}`);
          setImages(paths);
        }).catch(() => setImages(null));
      })
      .catch((err) => {
        console.warn('failed to load lore file', err);
        setContentHtml(`<p>Не удалось загрузить файл: ${err.message || 'неизвестная ошибка'}</p>`);
      });
  }

  if (!manifest) return <div className="lore-root">Loading...</div>;

  const tabs: { key: typeof active; label: string }[] = [
    { key: 'poi', label: 'Точки Интереса' },
    { key: 'buildings', label: 'Строения' },
    { key: 'characters', label: 'Персонажи' },
    { key: 'clippings', label: 'Газетные статьи' },
    { key: 'timeline', label: 'Время' },
  ];

  const listFor = (k: typeof active) => {
    switch (k) {
      case 'poi': return manifest.poi;
      case 'buildings': return manifest.buildings;
      case 'characters': return manifest.characters;
      case 'clippings': return manifest.clippings;
      case 'timeline': return manifest.timeline;
    }
  };

  const displayName = (fn: string) => fn.replace(/\.md$/i, '');

  return (
    <div className="lore-root">
      <button className="lore-back-top" onClick={() => nav('/')}>← Home</button>
      <h2>Лор</h2>
      <div className="lore-topbar">
        <div className="lore-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`lore-tab ${active === t.key ? 'active' : ''}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="lore-inline-list">
          {listFor(active).map((f) => (
            <button key={f} className="lore-link" onClick={() => openFile(active, f)}>{displayName(f)}</button>
          ))}
        </div>
      </div>

      <hr className="lore-sep" />

      <main className="lore-content">
        {title && <h3 className="lore-title">{displayName(title)}</h3>}
        {images && images.length > 0 && (
          <div className="lore-gallery">
            {images.map((src) => (
              // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
              <img key={src} src={src} className="lore-thumb" alt="" onClick={() => setViewer(src)} />
            ))}
          </div>
        )}

        {contentHtml ? (
          <div className="lore-article" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <div className="lore-empty">Выберите элемент сверху, чтобы прочитать</div>
        )}

        {viewer && (
          <div className="lore-viewer" onClick={() => setViewer(null)}>
            <img src={viewer} alt="full" />
          </div>
        )}
      </main>
    </div>
  );
}
