import { useState, useEffect, useRef } from 'react';
import type { Chapter, Book, BookInfo, BooksListResponse } from './types';
import type { Theme } from './loreLayout';
import './eReader.css';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';

type ViewMode = 'books' | 'reading';
type PageType = 'prose' | 'newspaper';

interface Frontmatter {
  title: string;
  tags: string[];
  colors: Record<string, string>;
  type: string;
}

// ── Парсер frontmatter ────────────────────────────────────────────────────────
function parseFrontmatter(raw: string): Frontmatter {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { title: '', tags: [], colors: {}, type: 'prose' };
  const fm = m[1];
  const title = (fm.match(/title:\s*(.+)/) || [])[1]?.trim() ?? '';
  const tagsRaw = (fm.match(/tags:\s*\[([^\]]*)\]/) || [])[1] ?? '';
  const tags = tagsRaw.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean);
  const type = (fm.match(/type:\s*(.+)/) || [])[1]?.trim() ?? 'prose';
  const colors: Record<string, string> = {};
  const cb = fm.match(/colors:\n((?:  .+\n?)*)/);
  if (cb) {
    for (const line of cb[1].split('\n')) {
      const cm = line.match(/\s+(.+?):\s*["']?(#[0-9a-fA-F]{3,6})["']?/);
      if (cm) colors[cm[1].trim()] = cm[2];
    }
  }
  return { title, tags, colors, type };
}

function detectPageType(tags: string[], fmType: string): PageType {
  if (fmType === 'newspaper') return 'newspaper';
  if (tags.some(t => ['газета', 'документ', 'newspaper'].includes(t.toLowerCase()))) return 'newspaper';
  return 'prose';
}

// ── Инлайн-рендерер: **bold**, *italic*, `code` ───────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ fontSize: '0.9em', opacity: 0.8 }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

// ── Диалог с [/] — прерывает цветную часть ───────────────────────────────────
// Формат: [персонаж]: цветной текст[/], — обычный текст.
// Возвращает <p> с двумя span — цветным и обычным.
function renderDialogLine(
  text: string,
  color: string,
  key: number | string
): React.ReactNode {
  const breakIdx = text.indexOf('[/]');
  if (breakIdx === -1) {
    // Весь текст цветной
    return (
      <p key={key} className="prose-dialog" style={{ color }}>
        — {renderInline(text)}
      </p>
    );
  }
  const colored = text.slice(0, breakIdx);
  const normal = text.slice(breakIdx + 3); // после [/]
  return (
    <p key={key} className="prose-dialog">
      <span style={{ color }}>— {renderInline(colored)}</span>
      <span className="prose-dialog__tail">{renderInline(normal)}</span>
    </p>
  );
}

// ── PROSE рендерер ────────────────────────────────────────────────────────────
function renderProse(raw: string, colors: Record<string, string>): React.ReactNode[] {
  const body = raw.replace(/^---[\s\S]*?---\n?/, '');
  const blocks = body.split(/\n\n+/);

  return blocks.map((block, i) => {
    const t = block.trim();
    if (!t) return null;

    // ~~~ жёсткий разрыв
    if (t === '~~~') return (
      <div key={i} className="prose-break-hard">
        <div className="prose-break-hard__line" />
        <div className="prose-break-hard__dots">
          {[0, 1, 2].map(j => <div key={j} className="prose-break-hard__dot" />)}
        </div>
        <div className="prose-break-hard__line" />
      </div>
    );

    // ~~ лёгкий разрыв
    if (t === '~~') return (
      <div key={i} className="prose-break-soft">
        <div className="prose-break-soft__line" />
      </div>
    );

    // ::пауза::
    if (t === '::пауза::') return (
      <p key={i} className="prose-pause">…</p>
    );

    // [персонаж]: текст — возможно с [/]
    const dm = t.match(/^\[(.+?)\]:\s([\s\S]+)/);
    if (dm) {
      const color = colors[dm[1]] ?? 'var(--accent)';
      const text = dm[2].replace(/\n/g, ' ');
      return renderDialogLine(text, color, i);
    }

    if (/^# /.test(t))  return <h1 key={i} className="prose-h1">{t.replace(/^# /, '')}</h1>;
    if (/^## /.test(t)) return <h2 key={i} className="prose-h2">{t.replace(/^## /, '')}</h2>;
    if (/^### /.test(t)) return <h3 key={i} className="prose-h3">{t.replace(/^### /, '')}</h3>;

    // Обычный абзац — каждая строка отдельно (одиночный \n — перенос внутри абзаца)
    return (
      <p key={i} className="prose-p">
        {t.split('\n').map((line, li, arr) => (
          <span key={li}>
            {renderInline(line)}
            {li < arr.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }).filter(Boolean) as React.ReactNode[];
}

// ── NEWSPAPER SVG-шум ─────────────────────────────────────────────────────────
function NoiseSvg({ opacity }: { opacity: number }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#n)' opacity='1'/></svg>`;
  return (
    <div
      className="np-noise"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        opacity,
      }}
    />
  );
}

// ── NEWSPAPER рендерер ────────────────────────────────────────────────────────
function renderNewspaper(raw: string): React.ReactNode[] {
  const body = raw.replace(/^---[\s\S]*?---\n?/, '');
  const sections = body.split(/\n===\n/);

  return sections.map((section, si) => {
    const trimSection = section.trim();
    const headerMatch = trimSection.match(/^\[газета:\s*(.+?)\s*\|\s*(.+?)\]/);
    let sectionBody = trimSection;
    let pubName = '', pubDate = '';
    if (headerMatch) {
      pubName = headerMatch[1];
      pubDate = headerMatch[2];
      sectionBody = trimSection.replace(/^\[газета:[^\]]+\]\n?/, '').trim();
    }

    const blocks = sectionBody.split(/\n\n+/);
    const renderedBlocks = blocks.map((block, i) => {
      const t = block.trim();
      if (!t) return null;

      if (/^>/.test(t)) return (
        <blockquote key={i} className="np-blockquote">
          {renderInline(t.replace(/^>\s*/gm, ''))}
        </blockquote>
      );
      if (t === '---') return <hr key={i} className="np-hr" />;
      if (/^### /.test(t)) return <h3 key={i} className="np-h3">{t.replace(/^### /, '')}</h3>;
      if (/^## /.test(t))  return <h2 key={i} className="np-h2">{t.replace(/^## /, '')}</h2>;
      if (/^# /.test(t))   return <h1 key={i} className="np-h1">{t.replace(/^# /, '')}</h1>;

      const isItalicPara = /^\*[^*]/.test(t) && t.endsWith('*');
      return (
        <p key={i} className={`np-p${isItalicPara ? ' italic' : ''}`}>
          {t.split('\n').map((line, li, arr) => (
            <span key={li}>{renderInline(line)}{li < arr.length - 1 && <br />}</span>
          ))}
        </p>
      );
    }).filter(Boolean);

    return (
      <div key={si} className="np-section">
        {si > 0 && (
          <div className="np-separator">
            <div className="np-separator__line" />
            <div className="np-separator__scissors">✂</div>
            <div className="np-separator__line" />
          </div>
        )}
        <div className={`np-paper${si % 2 !== 0 ? ' alt' : ''}`}>
          <NoiseSvg opacity={1} />
          <div className="np-vignette" />
          <div className="np-stain" />
          <div className="np-inner">
            {pubName && (
              <div className="np-header">
                <div className="np-header__rule-thick" />
                <div className="np-header__rule-thin" />
                <div className="np-header__name">{pubName}</div>
                <div className="np-header__meta">
                  <span>{pubDate}</span>
                  <span>◆</span>
                </div>
              </div>
            )}
            {renderedBlocks}
          </div>
        </div>
      </div>
    );
  });
}

// ── Главный компонент ─────────────────────────────────────────────────────────
interface EReaderProps {
  theme: Theme;
  onBookOpen?: (isOpen: boolean) => void;
  onThemeToggle?: () => void;
  initialBookId?: string;
}

interface ReadingProgress {
  bookId: string;
  currentChapter: number;
  scrollPercentage: number;
}

export default function EReader({ theme, onBookOpen, onThemeToggle, initialBookId }: EReaderProps) {
  const [view, setView] = useState<ViewMode>('books');
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [rawContent, setRawContent] = useState<string>('');
  const [chLoading, setChLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [unlockedChapters, setUnlockedChapters] = useState<Set<number>>(new Set([0])); // Первая глава всегда доступна

  const scrollRef = useRef<HTMLDivElement>(null);
  const listenerRef = useRef<(() => void) | null>(null);
  const progressSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузка списка книг
  useEffect(() => { fetchBooksList(); }, []);

  // Загрузка книги по initialBookId
  useEffect(() => {
    if (initialBookId && books.length > 0) {
      const book = books.find(b => b.id === initialBookId);
      if (book) {
        selectBook(book);
      }
    }
  }, [initialBookId, books]);

  // ─── localStorage helpers ────────────────────────────────────────────────────
  const saveReadingProgress = (bookId: string, currentChapter: number, scrollPercentage: number) => {
    try {
      const progress: ReadingProgress = { bookId, currentChapter, scrollPercentage };
      localStorage.setItem(`reading-progress-${bookId}`, JSON.stringify(progress));
    } catch (err) {
      console.warn('Failed to save reading progress:', err);
    }
  };

  const loadReadingProgress = (bookId: string): ReadingProgress | null => {
    try {
      const data = localStorage.getItem(`reading-progress-${bookId}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn('Failed to load reading progress:', err);
      return null;
    }
  };



  // Загрузка главы при смене индекса
  useEffect(() => {
    if (view === 'reading' && selectedBook && currentIndex < selectedBook.chapters.length) {
      // Разблокируем текущую главу
      setUnlockedChapters(prev => new Set([...prev, currentIndex]));
      
      // Сохраняем прогресс
      saveReadingProgress(selectedBook.id, currentIndex, 0);
      
      loadChapterContent(selectedBook.chapters[currentIndex]);
    }
  }, [currentIndex, selectedBook, view]);

  // Прогресс прокрутки — через RAF после загрузки контента
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (listenerRef.current) el.removeEventListener('scroll', listenerRef.current);

    const update = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      const progress = scrollable > 0 ? Math.round((el.scrollTop / scrollable) * 100) : 100;
      setScrollProgress(progress);
      
      // Сохраняем прогресс прокрутки с задержкой
      if (selectedBook && progressSaveTimeout.current) clearTimeout(progressSaveTimeout.current);
      progressSaveTimeout.current = setTimeout(() => {
        if (selectedBook) {
          saveReadingProgress(selectedBook.id, currentIndex, progress);
        }
      }, 1000); // Сохраняем через 1 сек после остановки прокрутки
    };
    listenerRef.current = update;
    el.addEventListener('scroll', update);
    
    // Восстанавливаем прогресс прокрутки после загрузки контента
    requestAnimationFrame(() => {
      if (selectedBook) {
        const progress = loadReadingProgress(selectedBook.id);
        if (progress && progress.currentChapter === currentIndex && progress.scrollPercentage > 0) {
          const scrollable = el.scrollHeight - el.clientHeight;
          el.scrollTop = (progress.scrollPercentage / 100) * scrollable;
        } else {
          el.scrollTop = 0;
        }
      } else {
        el.scrollTop = 0;
      }
      // Обновляем текущий прогресс
      requestAnimationFrame(update);
    });

    return () => {
      if (listenerRef.current) { el.removeEventListener('scroll', listenerRef.current); listenerRef.current = null; }
      if (progressSaveTimeout.current) clearTimeout(progressSaveTimeout.current);
    };
  }, [currentIndex, chLoading, selectedBook]);

  const fetchBooksList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/get-lore/books_list`);
      if (!res.ok) throw new Error('Failed to fetch books list');
      const data: BooksListResponse = await res.json();
      setBooks(data.books);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const selectBook = async (book: BookInfo) => {
    setChLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/get-lore/book/${book.id}`);
      if (!res.ok) throw new Error('Failed to fetch book');
      const bookData: Book = await res.json();
      setSelectedBook(bookData);
      
      // Восстанавливаем прогресс из localStorage
      const progress = loadReadingProgress(book.id);
      if (progress) {
        setCurrentIndex(progress.currentChapter);
        // Восстанавливаем разблокированные главы (все главы до текущей + сама текущая)
        const unlocked = new Set<number>();
        for (let i = 0; i <= progress.currentChapter; i++) {
          unlocked.add(i);
        }
        setUnlockedChapters(unlocked);
      } else {
        // Новая книга - только первая глава доступна
        setCurrentIndex(0);
        setUnlockedChapters(new Set([0]));
      }
      
      setView('reading');
      onBookOpen?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setChLoading(false);
    }
  };

  const loadChapterContent = async (chapter: Chapter) => {
    if (chapter.raw) { 
      setRawContent(chapter.raw);
      return;
    }
    if (!chapter.url) return;
    setChLoading(true);
    try {
      const res = await fetch(chapter.url);
      if (!res.ok) throw new Error('Failed to load chapter');
      setRawContent(await res.text());
    } catch {
      setRawContent('Ошибка загрузки главы.');
    } finally {
      setChLoading(false);
    }
  };

  const goBackToBooks = () => {
    if (selectedBook) {
      // Сохраняем последний прогресс перед выходом
      saveReadingProgress(selectedBook.id, currentIndex, scrollProgress);
    }
    setView('books');
    setSelectedBook(null);
    setCurrentIndex(0);
    setRawContent('');
    setUnlockedChapters(new Set([0]));
    onBookOpen?.(false);
  };

  // ─── VIEW: Список книг ───────────────────────────────────────────────────────
  if (view === 'books') {
    return (
      <div className="er-books-view">
        <div className="er-books__header">
          <h2 className="er-books__title">Истории</h2>
          <button className="er-books__refresh" onClick={fetchBooksList} disabled={loading} title="Обновить">
            ↻
          </button>
        </div>

        {error && <div className="er-books__error">{error}</div>}

        <div className="er-books__list">
          {loading ? (
            <div className="er-books__loading">Загрузка…</div>
          ) : books.length === 0 ? (
            <div className="er-books__empty">Книги не найдены</div>
          ) : (
            books.map(book => {
              const progress = loadReadingProgress(book.id);
              return (
                <button key={book.id} className="er-book-card" onClick={() => selectBook(book)}>
                  {book.cover && <img src={book.cover} alt={book.title} className="er-book-card__cover" />}
                  <div className="er-book-card__content">
                    <h3 className="er-book-card__title">{book.title}</h3>
                    {book.author && <p className="er-book-card__author">{book.author}</p>}
                    {book.description && <p className="er-book-card__description">{book.description}</p>}
                    <div className="er-book-card__meta">
                      <span className="er-book-card__chapters">
                        {progress
                          ? `Глава ${progress.currentChapter + 1} из ${book.chaptersCount || '…'}`
                          : `${book.chaptersCount} глав`}
                      </span>
                      <span className={`er-book-card__status er-book-card__status--${book.status}`}>
                        {book.status === 'completed' && 'Завершено'}
                        {book.status === 'in-progress' && 'В процессе'}
                        {book.status === 'draft' && 'Черновик'}
                      </span>
                    </div>
                    {book.tags && book.tags.length > 0 && (
                      <div className="er-book-card__tags">
                        {book.tags.map(tag => <span key={tag} className="er-book-card__tag">{tag}</span>)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ─── VIEW: Чтение ────────────────────────────────────────────────────────────
  if (!selectedBook) return null;

  const currentChapter = selectedBook.chapters[currentIndex];
  const { title: chapterTitle, tags, colors, type: fmType } = parseFrontmatter(rawContent);
  const pageType = detectPageType(tags, fmType);

  return (
    <div className="er-root" data-theme={theme}>

      {/* Overlay для мобильного сайдбара */}
      {sidebarOpen && (
        <div className="er-overlay show" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`er-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="er-sidebar__head">
          <div className="er-sidebar__head-row1">
            <button className="er-sidebar__back" onClick={goBackToBooks} title="К списку книг">←</button>
            <button
              className="er-sidebar__theme-toggle"
              onClick={onThemeToggle}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              <span className={`er-sidebar__theme-knob ${theme === 'dark' ? 'dark' : ''}`}>
                {theme === 'dark' ? '☾' : '☀'}
              </span>
            </button>
          </div>
          <h3 className="er-sidebar__label">{selectedBook.title}</h3>
        </div>
        <ul className="er-sidebar__list">
          {selectedBook.chapters.map((ch, idx) => (
            // Показываем только разблокированные главы
            unlockedChapters.has(idx) && (
              <li key={ch.id} className={`er-sidebar__item ${idx === currentIndex ? 'active' : ''}`}>
                <button
                  className="er-sidebar__item-title"
                  onClick={() => { setCurrentIndex(idx); setSidebarOpen(false); }}
                >
                  {ch.title}
                </button>
              </li>
            )
          ))}
        </ul>
      </aside>

      {/* ── Main ── */}
      <div className="er-container">

        {/* Top bar */}
        <div className="er-topbar">
          <button className="er-topbar__menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <h1 className="er-topbar__title">
            {chapterTitle || currentChapter?.title || '…'}
          </h1>
          <span className="er-topbar__progress-text">{scrollProgress}%</span>
        </div>

        {/* Progress bar — прогресс прокрутки текущей главы */}
        <div className="er-progress-track">
          <div className="er-progress-fill" style={{ width: `${scrollProgress}%` }} />
        </div>

        {/* Content */}
        <div className="er-scroll" ref={scrollRef}>
          <div className="er-content">
            {chLoading ? (
              <div className="er-card__loading">Загрузка главы…</div>
            ) : error ? (
              <div className="er-card__error">{error}</div>
            ) : (
              <div className="er-card">
                {/* Теги — только для prose */}
                {pageType === 'prose' && tags.length > 0 && (
                  <div className="er-card__tags">
                    {tags.map(tag => <span key={tag} className="er-card__tag">{tag}</span>)}
                  </div>
                )}
                <div className={`er-card__body ${pageType === 'newspaper' ? 'newspaper' : ''}`}>
                  {pageType === 'prose' && renderProse(rawContent, colors)}
                  {pageType === 'newspaper' && renderNewspaper(rawContent)}
                </div>
              </div>
            )}
          </div>
          {/* Navigation */}
          <div className="er-nav">
            <button
              className="er-nav__btn"
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              ← Назад
            </button>
            <span className="er-counter">
              <span className="er-counter__current">{currentIndex + 1}</span>
              <span className="er-counter__sep"> / </span>
              <span className="er-counter__total">?</span>
            </span>
            <button
              className="er-nav__btn next"
              onClick={() => setCurrentIndex(i => Math.min(selectedBook.chapters.length - 1, i + 1))}
              disabled={currentIndex === selectedBook.chapters.length - 1}
            >
              Вперёд →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
