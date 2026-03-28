import { nanoid } from 'nanoid';
import type { Screen, ScreenType } from '@typedefs/funnel';
import type { ProjectDocument } from '@typedefs/project';

export function createDefaultScreen(
  id: string,
  name: string,
  type: ScreenType,
  position: { x: number; y: number },
  order: number,
): Screen {
  return {
    id,
    order,
    name,
    type,
    tags: [],
    position,
    settings: {
      progressBar: true,
      progressValue: 'auto',
      backButton: order > 0,
      autoNavigate: type === 'survey',
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
  };
}

export function createDefaultProject(): ProjectDocument {
  const startScreen = createDefaultScreen('welcome', 'Welcome', 'survey', { x: 0, y: 0 }, 0);
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnail: '',
    assets: { assets: {} },
    funnel: {
      schemaVersion: 1,
      meta: {
        id: `funnel-${nanoid(6)}`,
        name: 'New Funnel',
        favicon: '',
        title: 'My Funnel',
        startScreenId: 'welcome',
        domain: '',
        lang: 'en',
        locales: ['en'],
        funnelApiVersion: 1,
        termsUrl: '',
        privacyUrl: '',
        supportUrl: '',
        paymentCredentials: [],
        analytics: { integrations: [], headCode: '' },
      },
      globalStyles: {
        '--bg': '#f8f9fa',
        '--card-bg': '#ffffff',
        '--text': '#1a1a2e',
        '--text-muted': '#6c757d',
        '--accent': '#3b82f6',
        '--accent-hover': '#2563eb',
        '--border-tile': '#e5e7eb',
        '--radius': '16px',
        '--radius-sm': '12px',
        '--shadow': '0 2px 8px rgba(0,0,0,0.08)',
        '--transition': 'all 0.2s ease',
        '--pad-x': '20px',
        '--pad-y': '16px',
        '--container-max': '480px',
        '--h1-size': '24px',
        '--h2-size': '20px',
        '--body-size': '16px',
        '--option-font': '16px',
        '--font-family': "'Inter', sans-serif",
      },
      screens: { welcome: startScreen },
      elements: {},
      connections: [],
      blocks: [],
    },
  };
}
