import { useFunnelStore } from '@store/funnel-store';
import { BlockLibrary } from '@components/panels/BlockLibrary';
import { ScreenList } from '@components/panels/ScreenList';
import { FileExplorer } from '@components/panels/FileExplorer';

export function LeftPanel() {
  const mode = useFunnelStore((s) => s.ui.mode);

  if (mode === 'map') return <BlockLibrary />;
  if (mode === 'manager') return <ScreenList />;
  if (mode === 'developer') return <FileExplorer />;
  return null;
}
