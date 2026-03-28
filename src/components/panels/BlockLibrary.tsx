import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Layout,
  Type,
  MousePointerClick,
  Image,
  CreditCard,
  Star,
  Navigation,
  MessageSquare,
  BarChart3,
  FileText,
  Code2,
  FolderOpen,
  Search,
  ChevronRight,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { componentRegistry } from '@services/component-registry';
import { BlockLibraryItem } from './BlockLibraryItem';
import styles from './BlockLibrary.module.css';

// ── Category metadata ──────────────────────────────────────────────────────

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  content:      { label: 'Content',      icon: Type },
  interactive:  { label: 'Interactive',  icon: MousePointerClick },
  layout:       { label: 'Layout',       icon: Layout },
  media:        { label: 'Media',        icon: Image },
  form:         { label: 'Forms',        icon: FileText },
  payment:      { label: 'Payment',      icon: CreditCard },
  'social-proof': { label: 'Social Proof', icon: Star },
  navigation:   { label: 'Navigation',   icon: Navigation },
  feedback:     { label: 'Feedback',     icon: MessageSquare },
  result:       { label: 'Results',      icon: BarChart3 },
  templates:    { label: 'Templates',    icon: FolderOpen },
  custom:       { label: 'Custom HTML',  icon: Code2 },
};

const FALLBACK_META: CategoryMeta = { label: 'Other', icon: FolderOpen };

// ── Component ──────────────────────────────────────────────────────────────

export function BlockLibrary() {
  const [query, setQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(['content', 'interactive']),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 200);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Search mode: flat filtered list ──────────────────────────────────────

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return null;
    return componentRegistry.search(debouncedQuery);
  }, [debouncedQuery]);

  // ── Browse mode: categories with item counts ──────────────────────────────

  const categories = useMemo(() => {
    const cats = componentRegistry.getManifestCategories();
    return cats.map((id) => {
      const items = componentRegistry.getManifestByCategory(id);
      const meta = CATEGORY_META[id] ?? FALLBACK_META;
      return { id, meta, items };
    });
  }, []);

  return (
    <div className={styles.panel}>
      {/* Search */}
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search blocks..."
          className={styles.searchInput}
          spellCheck={false}
        />
        {query && (
          <button className={styles.clearBtn} onClick={clearSearch} aria-label="Clear search">
            <X size={12} />
          </button>
        )}
      </div>

      <div className={styles.content}>
        {/* ── Search results ── */}
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <p className={styles.empty}>No blocks match "{debouncedQuery}"</p>
          ) : (
            <div className={styles.searchResults}>
              <p className={styles.resultsLabel}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
              {searchResults.map((entry) => (
                <BlockLibraryItem key={entry.id} entry={entry} />
              ))}
            </div>
          )
        ) : (
          /* ── Accordion browse ── */
          <div className={styles.categoryList}>
            {categories.map(({ id, meta, items }) => {
              const Icon = meta.icon;
              const isOpen = expandedCategories.has(id);
              return (
                <div key={id} className={styles.category}>
                  <button
                    className={styles.categoryHeader}
                    onClick={() => toggleCategory(id)}
                    aria-expanded={isOpen}
                  >
                    <ChevronRight
                      size={14}
                      className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                    />
                    <Icon size={15} className={styles.categoryIcon} />
                    <span className={styles.categoryLabel}>{meta.label}</span>
                    <span className={styles.categoryCount}>{items.length}</span>
                  </button>

                  {isOpen && (
                    <div className={styles.categoryItems}>
                      {items.map((entry) => (
                        <BlockLibraryItem key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
