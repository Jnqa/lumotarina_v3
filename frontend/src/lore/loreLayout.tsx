import { useState, useEffect } from 'react';
import LoreWiki from './loreWiki';
import EReader from './eReader';
import './loreLayout.css';

export type Theme = 'light' | 'dark';

interface LoreLayoutProps {
  initialBookId?: string;
}

export default function LoreLayout({ initialBookId }: LoreLayoutProps) {
  const [activeTab, setActiveTab] = useState<'wiki' | 'stories'>(initialBookId ? 'stories' : 'wiki');
  const [theme, setTheme] = useState<Theme>('dark');
  const [bookOpen, setBookOpen] = useState(!!initialBookId);

  // Синхронизируем data-theme с <html> — CSS-переменные подхватят
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div className="lore-layout" data-theme={theme}>
      {!bookOpen && (
        <div className="lore-layout__header">
          <button className="lore-layout__back" onClick={() => window.history.back()}>
            ← Home
          </button>

          <div className="lore-layout__tabs">
            <button
              className={`lore-layout__tab ${activeTab === 'wiki' ? 'active' : ''}`}
              onClick={() => setActiveTab('wiki')}
            >
              Wiki
            </button>
            <button
              className={`lore-layout__tab ${activeTab === 'stories' ? 'active' : ''}`}
              onClick={() => setActiveTab('stories')}
            >
              Истории
            </button>
          </div>

          {/* Переключатель темы — в хедере лейаута */}
          <button
            className="lore-layout__theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            <span className={`lore-layout__theme-knob ${theme === 'dark' ? 'dark' : ''}`}>
              {theme === 'dark' ? '☾' : '☀'}
            </span>
          </button>
        </div>
      )}

      <div className="lore-layout__content">
        {activeTab === 'wiki' && <LoreWiki />}
        {activeTab === 'stories' && (
          <EReader theme={theme} onBookOpen={setBookOpen} onThemeToggle={toggleTheme} initialBookId={initialBookId} />
        )}
      </div>
    </div>
  );
}
