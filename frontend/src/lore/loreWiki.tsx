import { useEffect, useState } from 'react';
import { API_BASE } from '../utils/session';

type LoreSection = {
  id: string;
  title: string;
  url: string;
  color?: string;
};

type WikiSectionItem = {
  id?: string;
  name?: string;
  title?: string;
  filename?: string;
  description?: string;
  images?: string[];
};

type SectionItem = string | WikiSectionItem;

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

export default function LoreWiki() {
  const [sections, setSections] = useState<LoreSection[] | null>(null);
  const [activeSection, setActiveSection] = useState<LoreSection | null>(null);
  const [items, setItems] = useState<SectionItem[]>([]);
  const [contentHtml, setContentHtml] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [images, setImages] = useState<string[] | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [loadingSection, setLoadingSection] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/get-lore/lore`)
      .then((r) => {
        if (!r.ok) throw new Error('no lore manifest');
        return r.json();
      })
      .then((data: LoreSection[]) => {
        setSections(data);
        setActiveSection(data[0] || null);
      })
      .catch(() => {
        setSections([]);
        setActiveSection(null);
      });
  }, []);

  useEffect(() => {
    if (!activeSection) {
      setItems([]);
      return;
    }

    setLoadingSection(true);
    setItems([]);
    fetch(activeSection.url)
      .then(async (r) => {
        if (!r.ok) throw new Error('failed to load section');
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        } else if (data && Array.isArray((data as any).items)) {
          setItems((data as any).items);
        } else {
          setItems([]);
        }
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setLoadingSection(false);
      });
  }, [activeSection]);

  const normalizeDescriptionPath = (description: string) => {
    if (description.startsWith('/images/media/cities/')) {
      return description.replace('/images/media/cities/', '/s3/media/cities/');
    }
    return description;
  };

  const getDisplayName = (item: SectionItem) => {
    if (typeof item === 'string') return item.replace(/\.md$/i, '');
    return item.title || item.name || item.filename || item.id || 'Без имени';
  };

  const openRemoteMarkdown = (path: string, label: string) => {
    setContentHtml(null);
    setTitle(label);
    setImages(null);
    setViewer(null);

    const url = encodeURI(normalizeDescriptionPath(path));

    fetch(url)
      .then(async (r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        const text = await r.text();
        if (ct.includes('text/html') || text.trim().toLowerCase().startsWith('<!doctype html')) {
          throw new Error('not-found-html');
        }
        if (!r.ok) throw new Error('failed');
        return text;
      })
      .then((md) => setContentHtml(simpleMarkdownToHtml(md)))
      .catch((err) => {
        console.warn('failed to load lore file', err);
        setContentHtml(`<p>Не удалось загрузить файл: ${err.message || 'неизвестная ошибка'}</p>`);
      });
  };

  const openFile = (category: string, filename: string) => {
    setContentHtml(null);
    setTitle(filename);
    setViewer(null);
    const enc = encodeURIComponent(filename);
    const tryPath = (p: string) =>
      fetch(p).then(async (r) => {
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        const text = await r.text();
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
        if (err && err.message === 'not-found-html') {
          return tryPath(fallback);
        }
        throw err;
      })
      .then((md) => {
        setContentHtml(simpleMarkdownToHtml(md));
        const base = filename.replace(/\.md$/i, '');
        const encBase = encodeURIComponent(base);
        fetch(`/lore/${category}/${encBase}/images.json`)
          .then((r) => {
            if (!r.ok) throw new Error('no images');
            return r.json();
          })
          .then((arr: string[]) => {
            const paths = arr.map((n) => `/lore/${category}/${encBase}/${n}`);
            setImages(paths);
          })
          .catch(() => setImages(null));
      })
      .catch((err) => {
        console.warn('failed to load lore file', err);
        setContentHtml(`<p>Не удалось загрузить файл: ${err.message || 'неизвестная ошибка'}</p>`);
      });
  };

  const openItem = (item: SectionItem) => {
    if (!activeSection) return;

    if (typeof item === 'string') {
      openFile(activeSection.id, item);
      return;
    }

    if (item.description) {
      openRemoteMarkdown(item.description, getDisplayName(item));
      return;
    }

    if (item.filename) {
      openFile(activeSection.id, item.filename);
      return;
    }

    if (item.id) {
      openRemoteMarkdown(`/s3/media/cities/${encodeURIComponent(item.id)}.md`, getDisplayName(item));
    }
  };

  if (!sections) return <div className="wiki-root">Loading...</div>;

  return (
    <div className="wiki-root">
      <h2>Вики</h2>
      <div className="wiki-info">⚠ 📰 газетные статьи не актуальны. <br />✍ Лор в процессе обновления.📒</div>
      <div className="wiki-topbar">
        <div className="wiki-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`wiki-tab ${activeSection?.id === section.id ? 'active' : ''}`}
              style={section.color ? { borderColor: section.color } : undefined}
              onClick={() => setActiveSection(section)}
            >
              {section.title}
            </button>
          ))}
        </div>
        <div className="wiki-inline-list">
          {loadingSection ? (
            <div className="wiki-empty">Загрузка списка...</div>
          ) : items.length > 0 ? (
            items.map((item, index) => (
              <button
                key={`${getDisplayName(item)}-${index}`}
                className="wiki-link"
                onClick={() => openItem(item)}
              >
                {getDisplayName(item)}
              </button>
            ))
          ) : (
            <div className="wiki-empty">Выберите раздел, чтобы загрузить список.</div>
          )}
        </div>
      </div>

      <hr className="wiki-sep" />

      <main className="wiki-content">
        {title && <h3 className="wiki-title">{title}</h3>}
        {images && images.length > 0 && (
          <div className="wiki-gallery">
            {images.map((src) => (
              <img
                key={src}
                src={src}
                className="wiki-thumb"
                alt=""
                onClick={() => setViewer(src)}
              />
            ))}
          </div>
        )}

        {contentHtml ? (
          <div className="wiki-article" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <div className="wiki-empty">Выберите элемент сверху, чтобы прочитать</div>
        )}

        {viewer && (
          <div className="wiki-viewer" onClick={() => setViewer(null)}>
            <img src={viewer} alt="full" />
          </div>
        )}
      </main>
    </div>
  );
}
