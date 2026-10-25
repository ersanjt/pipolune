import { api } from './api';
import type { Currency } from './currency';

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  locale: 'en' | 'tr' | 'ru';
  role: 'customer' | 'owner' | 'manager' | 'editor' | 'content' | 'accountant' | 'fulfilment' | 'support';
  /** Studio permissions from the server (Perm::MAP); empty for customers. */
  permissions?: string[];
  emailVerified: boolean;
  marketing: boolean;
}

export interface Session {
  user: User | null;
  cartCount: number;
  wishlist: number[];
  settings: {
    salesMode: 'off' | 'request' | 'live';
    shippingStandard: Record<Currency, number | null>;
    catalogPreview: boolean;
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    night: boolean;
  };
  country: string;
}

// Kept on window so the header script and every island share one request and one state.
declare global {
  interface Window {
    __plSession?: Promise<Session>;
  }
}

export function getSession(refresh = false): Promise<Session> {
  if (!window.__plSession || refresh) {
    window.__plSession = api<Session>('/session');
    window.__plSession.then(emit).catch(() => {
      window.__plSession = undefined;
    });
  }
  return window.__plSession;
}

export function updateSession(patch: Partial<Session>): void {
  getSession().then((s) => {
    const next = { ...s, ...patch };
    window.__plSession = Promise.resolve(next);
    emit(next);
  });
}

function emit(session: Session): void {
  window.dispatchEvent(new CustomEvent<Session>('pl:session', { detail: session }));
}

export function onSession(callback: (s: Session) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<Session>).detail);
  window.addEventListener('pl:session', handler);
  return () => window.removeEventListener('pl:session', handler);
}

export function rememberLanguage(lang: string): void {
  document.cookie = `pl_lang=${lang}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}
