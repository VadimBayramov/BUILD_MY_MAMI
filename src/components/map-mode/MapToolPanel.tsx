import { MousePointer2, Square, Type } from 'lucide-react';
import { useFunnelStore } from '@store/funnel-store';
import type { MapTool } from '@typedefs/ui';
import styles from './MapToolPanel.module.css';

const TOOLS: { id: MapTool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: 'cursor',    icon: MousePointer2, label: 'Курсор — выделение и перемещение (Alt+E)', shortcut: 'E' },
  { id: 'container', icon: Square,        label: 'Контейнер — область с фоном (Alt+R)',      shortcut: 'R' },
  { id: 'text',      icon: Type,          label: 'Текст — редактирование текста (Alt+T)',     shortcut: 'T' },
];

export function MapToolPanel() {
  const mapTool = useFunnelStore((s) => s.ui.mapTool);
  const setMapTool = useFunnelStore((s) => s.setMapTool);

  return (
    <div className={styles.panel}>
      {TOOLS.map((tool, i) => {
        const Icon = tool.icon;
        return (
          <div key={tool.id}>
            {i > 0 && <div className={styles.separator} />}
            <button
              type="button"
              className={`${styles.btn} ${mapTool === tool.id ? styles.active : ''}`}
              onClick={() => setMapTool(tool.id)}
              title={tool.label}
            >
              <Icon size={16} />
              <span className={styles.shortcut}>{tool.shortcut}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
