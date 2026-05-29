import React, { useEffect, useState } from 'react';
import './reader.css';

interface ReaderProps {
  url: string;
  onClose: () => void;
}

function parseFrontmatter(raw: string) {
  // убираем BOM
  raw = raw.replace(/^\uFEFF/, '');

  const match = raw.match(
    /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/m
  );

  if (!match) {
    return {
      fm: {},
      body: raw.trim(),
    };
  }

  const fmRaw = match[1];
  const body = raw.slice(match[0].length).trim();

  const fm: any = {};

  for (const line of fmRaw.split(/\r?\n/)) {
    const idx = line.indexOf(':');

    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();

    let value: string | string[] = line.slice(idx + 1).trim();

    // characters: [ "a", "b" ]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = [];
      }
    }

    fm[key] = value;
  }

  return {
    fm,
    body,
  };
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

export default function Reader({ url, onClose }: ReaderProps) {
  const [raw, setRaw] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadingPhrases = [ 
    'Восстанавливаем следы прошлого...', 
    'Собираем фрагменты воспоминаний...', 
    'Пески времени приходят в движение...', 
    'Извлекаем уцелевшие записи...', 
    'Хроника медленно проявляется...', 
    'Эхо старых событий становится громче...', 
    'Пески времени собирают утерянные события...',
    'Архив воспоминаний нестабилен...', 
    'Восстанавливаем хронологию событий...', 
    'Пески времени переносят вас в прошлое...'
  ];

  const [loadingPhrase, setLoadingPhrase] = useState(loadingPhrases[0]);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
        setLoadingPhrase((prev) => {
        const available = loadingPhrases.filter(
            (p) => p !== prev
        );

        return available[
            Math.floor(Math.random() * available.length)
        ];
        });
    }, 2600);

    return () => clearInterval(interval);
    }, [loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        const text = await r.text();
        if (!cancelled) setRaw(text);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const { fm, body } = parseFrontmatter(raw || '');

  // Simple block renderer: headings, blockquote, code blocks, paragraphs
  function renderBody() {
    const lines = body.split('\n');
    const out: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        out.push(<pre className="reader-code" key={i}><code>{codeLines.join('\n')}</code></pre>);
        i++;
        continue;
      }
      if (/^#{1,6}\s/.test(line)) {
        const level = line.match(/^#+/)![0].length;
        const text = line.replace(/^#{1,6}\s/, '');
        switch (level) {
          case 1: out.push(<h1 key={i}>{renderInline(text)}</h1>); break;
          case 2: out.push(<h2 key={i}>{renderInline(text)}</h2>); break;
          case 3: out.push(<h3 key={i}>{renderInline(text)}</h3>); break;
          case 4: out.push(<h4 key={i}>{renderInline(text)}</h4>); break;
          case 5: out.push(<h5 key={i}>{renderInline(text)}</h5>); break;
          default: out.push(<h6 key={i}>{renderInline(text)}</h6>); break;
        }
        i++;
        continue;
      }
      if (line.startsWith('>')) {
        const q: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          q.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push(<blockquote className="reader-quote" key={i}>{renderInline(q.join('\n'))}</blockquote>);
        continue;
      }
      // paragraph (collect until empty line)
      if (line.trim() === '') {
        i++; continue;
      }
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        para.push(lines[i]); i++;
      }
      out.push(<p key={i}>{renderInline(para.join('\n'))}</p>);
    }
    return out;
  }

  return (
    <div className="reader-root">
      <div className="reader-header">
        <div className="reader-header-left">
          <button className="reader-close" onClick={onClose}>✕</button>
          <div className="reader-title">{fm.title || 'Читалка'}</div>
        </div>
      </div>

      <div className="reader-body">

        <div className="reader-content">
          {loading && (
          <div className="reader-loading">

              <div className="reader-loading-noise" />

              <div className="reader-loading-center">

              <div className="reader-loading-rings">
                  <div />
                  <div />
                  <div />
              </div>

              <div className="reader-loading-title">
                  REWIND
              </div>

              <div
                  key={loadingPhrase}
                  className="reader-loading-text"
              >
                  {loadingPhrase}
              </div>

              <div className="reader-loading-line" />

              <div className="reader-loading-subtext">
                  Архив событий восстанавливается
              </div>

              </div>
          </div>
          )}

          {error && <div className="reader-error">{error}</div>}
          {!loading && !error && (
            <article className="reader-article">
                <div className="reader-meta-inline">
                    {Array.isArray(fm.characters) &&
                    fm.characters.map((char: string) => (
                        <div
                        key={char}
                        className="reader-meta-badge"
                        >
                        {char}
                        </div>
                    ))}
                    {/* {fm.date && (
                    <div className="reader-meta-date-badge">
                        {fm.date}
                    </div>
                    )} */}
                </div>
                {renderBody()}
                </article>
          )}
        </div>
      </div>
    </div>
  );
}
