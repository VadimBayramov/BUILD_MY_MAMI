import { AppShell } from '@components/layout/AppShell';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';

export function App() {
  useKeyboardShortcuts();

  return <AppShell />;
}
