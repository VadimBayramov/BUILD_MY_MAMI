import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import styles from './QuickSearch.module.css';

interface SearchResult {
  screenId: string;
  screenName: string;
  matchType: 'name' | 'content';
  matchText: string;
}

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setQuery('');
      setSelectedIndex(0);
    };
    window.addEventListener('funnel:search-open', handler);
    return () => window.removeEventListener('funnel:search-open', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const screens = useFunnelStore((s) => s.project.funnel.screens);
  const elements = useFunnelStore((s) => s.project.funnel.elements);

  const results = useMemo((): SearchResult[] => {
    const allScreens = Object.values(screens).sort((a, b) => a.order - b.order);

    if (!query.trim()) {
      return allScreens.map((s) => ({
        screenId: s.id,
        screenName: s.name,
        matchType: 'name',
        matchText: s.id,
      }));
    }

    const q = query.toLowerCase();
    const matches: SearchResult[] = [];
    const seen = new Set<string>();

    for (const screen of allScreens) {
      if (screen.name.toLowerCase().includes(q) || screen.id.toLowerCase().includes(q)) {
        matches.push({ screenId: screen.id, screenName: screen.name, matchType: 'name', matchText: screen.id });
        seen.add(screen.id);
      }
    }

    for (const el of Object.values(elements)) {
      if (seen.has(el.screenId)) continue;
      if (el.content.toLowerCase().includes(q)) {
        const screen = screens[el.screenId];
        if (screen) {
          matches.push({
            screenId: screen.id,
            screenName: screen.name,
            matchType: 'content',
            matchText: el.content.substring(0, 60),
          });
          seen.add(screen.id);
        }
      }
    }

    return matches;
  }, [query, screens, elements]);

  const selectResult = useCallback((result: SearchResult) => {
    useFunnelStore.getState().selectScreen(result.screenId, false);
    window.dispatchEvent(new CustomEvent('funnel:focus-node', { detail: result.screenId }));
    setOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        selectResult(results[selectedIndex]);
      }
    },
    [results, selectedIndex, selectResult],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={() => setOpen(false)}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={styles.inputWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск экрана по имени или содержимому…"
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')} type="button">
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.results}>
          {results.slice(0, 20).map((result, i) => (
            <button
              key={`${result.screenId}-${result.matchType}`}
              className={`${styles.resultItem} ${i === selectedIndex ? styles.selected : ''}`}
              onClick={() => selectResult(result)}
              onMouseEnter={() => setSelectedIndex(i)}
              type="button"
            >
              <span className={styles.resultName}>{result.screenName}</span>
              <span className={styles.resultMeta}>
                {result.matchType === 'content' ? `"${result.matchText}"` : result.matchText}
              </span>
            </button>
          ))}
          {results.length === 0 && query && (
            <div className={styles.noResults}>Ничего не найдено</div>
          )}
        </div>
      </div>
    </div>
  );
}
