import { useFunnelStore } from '@store/funnel-store';

export function useClipboard() {
  const copy = useFunnelStore((s) => s.copy);
  const paste = useFunnelStore((s) => s.paste);
  const duplicate = useFunnelStore((s) => s.duplicate);
  const hasClipboard = useFunnelStore((s) => s.ui.clipboard !== null);

  return { copy, paste, duplicate, hasClipboard };
}
