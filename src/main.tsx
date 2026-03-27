import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { useFunnelStore } from '@store/funnel-store';
import './styles/global.css';

if (import.meta.env.DEV) {
  const syncDebugStore = () => {
    window.__store = useFunnelStore.getState();
  };

  syncDebugStore();
  const unsubscribe = useFunnelStore.subscribe(() => {
    syncDebugStore();
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(unsubscribe);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
