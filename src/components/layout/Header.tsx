import { useState, useRef, useEffect } from 'react';
import {
  Map,
  LayoutDashboard,
  Code2,
  Undo2,
  Redo2,
  Save,
  Eye,
  Download,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  History,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useFunnelStore } from '@store/funnel-store';
import type { Mode } from '@typedefs/ui';
import styles from './Header.module.css';

const MODE_TABS: { mode: Mode; icon: typeof Map; label: string; shortcut: string }[] = [
  { mode: 'map', icon: Map, label: 'Map', shortcut: '1' },
  { mode: 'manager', icon: LayoutDashboard, label: 'Manager', shortcut: '2' },
  { mode: 'developer', icon: Code2, label: 'Developer', shortcut: '3' },
];

export function Header() {
  const mode = useFunnelStore((s) => s.ui.mode);
  const setMode = useFunnelStore((s) => s.setMode);
  const undo = useFunnelStore((s) => s.undo);
  const redo = useFunnelStore((s) => s.redo);
  const canUndo = useFunnelStore((s) => s.canUndo);
  const canRedo = useFunnelStore((s) => s.canRedo);
  const maxEntries = useFunnelStore((s) => s.history.maxEntries);
  const setMaxHistoryEntries = useFunnelStore((s) => s.setMaxHistoryEntries);
  const funnelName = useFunnelStore((s) => s.project.funnel.meta.name);
  const [showHistorySettings, setShowHistorySettings] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHistorySettings) return;
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistorySettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHistorySettings]);
  const leftCollapsed = useFunnelStore((s) => s.ui.leftPanelCollapsed);
  const rightCollapsed = useFunnelStore((s) => s.ui.rightPanelCollapsed);
  const togglePanel = useFunnelStore((s) => s.togglePanel);
  const addScreen = useFunnelStore((s) => s.addScreen);
  const saveProject = useFunnelStore((s) => s.saveProject);

  const handleAddScreen = () => {
    const screens = useFunnelStore.getState().project.funnel.screens;
    const count = Object.keys(screens).length;
    const id = `screen-${nanoid(6)}`;
    const xPositions = Object.values(screens).map((s) => s.position.x);
    const maxX = xPositions.length > 0 ? Math.max(...xPositions) : -400;

    addScreen({
      id,
      order: count,
      name: `Screen ${count + 1}`,
      type: 'survey',
      tags: [],
      position: { x: maxX + 400, y: 0 },
      settings: {
        progressBar: true,
        progressValue: 'auto',
        backButton: count > 0,
        autoNavigate: true,
        navigationDelay: 300,
        scrollToTop: true,
        transitionAnimation: 'fade',
      },
      customStyles: { overrides: {}, customCss: '', customClass: '' },
      customJs: { onEnter: '', onLeave: '', customScript: '' },
      customHead: { metaTags: [], ogTitle: '', ogImage: '', ogDescription: '', extraHead: '', i18n: {} },
      layout: {
        layoutType: 'default',
        headerVisible: true,
        footerVisible: true,
        backgroundImage: '',
        backgroundOverlay: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      payment: null,
      conditions: { showIf: null, skipIf: null, abTest: null },
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.panelToggle}
          onClick={() => togglePanel('left')}
          title={leftCollapsed ? 'Show left panel' : 'Hide left panel'}
        >
          {leftCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className={styles.logo}>
          <span className={styles.logoIcon}>F</span>
          <span className={styles.funnelName}>{funnelName}</span>
        </div>
      </div>

      <nav className={styles.center}>
        <div className={styles.modeTabs}>
          {MODE_TABS.map(({ mode: m, icon: Icon, label, shortcut }) => (
            <button
              key={m}
              className={`${styles.modeTab} ${mode === m ? styles.active : ''}`}
              onClick={() => setMode(m)}
              title={`${label} (${shortcut})`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className={styles.right}>
        {mode === 'map' && (
          <button className={styles.addBtn} onClick={handleAddScreen} title="Add Screen (A)">
            <Plus size={16} />
            <span>Screen</span>
          </button>
        )}

        <div className={styles.divider} />

        <button
          className={styles.iconBtn}
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className={styles.historyWrap} ref={historyRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowHistorySettings((v) => !v)}
            title={`History limit: ${maxEntries}`}
          >
            <History size={16} />
          </button>
          {showHistorySettings && (
            <div className={styles.historyPopup}>
              <label className={styles.historyLabel}>Undo steps</label>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={maxEntries}
                onChange={(e) => setMaxHistoryEntries(Number(e.target.value))}
                className={styles.historySlider}
              />
              <span className={styles.historyValue}>{maxEntries}</span>
            </div>
          )}
        </div>

        <div className={styles.divider} />

        <button className={styles.iconBtn} title="Preview (Ctrl+P)">
          <Eye size={18} />
        </button>
        <button className={styles.iconBtn} title="Save (Ctrl+S)" onClick={() => void saveProject()}>
          <Save size={18} />
        </button>
        <button className={styles.exportBtn} title="Export (Ctrl+E)">
          <Download size={16} />
          <span>Export</span>
        </button>

        <button
          className={styles.panelToggle}
          onClick={() => togglePanel('right')}
          title={rightCollapsed ? 'Show right panel' : 'Hide right panel'}
        >
          {rightCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
        </button>
      </div>
    </header>
  );
}
