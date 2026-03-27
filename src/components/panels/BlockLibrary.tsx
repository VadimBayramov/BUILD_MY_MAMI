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
} from 'lucide-react';
import styles from './BlockLibrary.module.css';

interface BlockCategory {
  id: string;
  label: string;
  icon: typeof Layout;
  count: number;
}

const CATEGORIES: BlockCategory[] = [
  { id: 'content', label: 'Content', icon: Type, count: 20 },
  { id: 'interactive', label: 'Interactive', icon: MousePointerClick, count: 30 },
  { id: 'layout', label: 'Layout', icon: Layout, count: 25 },
  { id: 'media', label: 'Media', icon: Image, count: 17 },
  { id: 'form', label: 'Forms', icon: FileText, count: 20 },
  { id: 'payment', label: 'Payment', icon: CreditCard, count: 17 },
  { id: 'social-proof', label: 'Social Proof', icon: Star, count: 14 },
  { id: 'navigation', label: 'Navigation', icon: Navigation, count: 9 },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, count: 14 },
  { id: 'result', label: 'Results', icon: BarChart3, count: 9 },
  { id: 'templates', label: 'Templates', icon: FolderOpen, count: 21 },
  { id: 'custom', label: 'Custom HTML', icon: Code2, count: 0 },
];

export function BlockLibrary() {
  return (
    <div className={styles.panel}>
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search blocks..."
          className={styles.searchInput}
        />
      </div>
      <div className={styles.categoryList}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} className={styles.categoryItem}>
            <cat.icon size={16} />
            <span className={styles.categoryLabel}>{cat.label}</span>
            <span className={styles.categoryCount}>{cat.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
