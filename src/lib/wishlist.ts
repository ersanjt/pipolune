import { api, ApiError } from './api';
import { getSession, onSession, updateSession, type Session } from './session';

const KEY = 'pl_wishlist';

declare global {
  interface Window {
    __plWishBound?: boolean;
  }
}

/** Pieces a guest saved on this device. Signing in copies them to the account. */
export function guestSlugs(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((slug): slug is string => typeof slug === 'string' && slug !== '') : [];
  } catch {
    return [];
  }
}

function writeGuest(slugs: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(slugs));
  window.dispatchEvent(new CustomEvent('pl:wishlist'));
}

export function toggleGuest(slug: string): void {
  const slugs = guestSlugs();
  writeGuest(slugs.includes(slug) ? slugs.filter((item) => item !== slug) : [slug, ...slugs]);
}

export function isSaved(slug: string, productId: number | null, session: Session | null): boolean {
  if (session?.user) return productId !== null && session.wishlist.includes(productId);
  return guestSlugs().includes(slug);
}

let merging: Promise<void> | null = null;

/** Copy this device's hearts onto the signed-in account, once per page. */
export function mergeGuestWishlist(session: Session): Promise<void> {
  if (!session.user) return Promise.resolve();
  if (merging) return merging;
  const slugs = guestSlugs();
  if (slugs.length === 0) return Promise.resolve();
  merging = (async () => {
    let ids = session.wishlist;
    const left: string[] = [];
    for (const slug of slugs) {
      try {
        const live = await api<{ id: number }>(`/catalog/${slug}?locale=en`);
        const res = await api<{ ids: number[] }>('/account/wishlist', { method: 'POST', body: { productId: live.id } });
        ids = res.ids;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status === 0) left.push(slug);
      }
    }
    writeGuest(left);
    updateSession({ wishlist: ids });
  })();
  return merging;
}

export async function toggleSaved(slug: string, productId: number | null): Promise<void> {
  const session = await getSession().catch(() => null);
  if (!session?.user) {
    toggleGuest(slug);
    return;
  }
  let id = productId;
  if (!id) {
    const live = await api<{ id: number }>(`/catalog/${slug}?locale=en`);
    id = live.id;
  }
  const on = session.wishlist.includes(id);
  const res = on
    ? await api<{ ids: number[] }>(`/account/wishlist/${id}`, { method: 'DELETE' })
    : await api<{ ids: number[] }>('/account/wishlist', { method: 'POST', body: { productId: id } });
  updateSession({ wishlist: res.ids });
}

function productIdOf(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Hearts, the header count, and the wishlist page all read the same saved list. */
export function bindWishlist(): void {
  if (window.__plWishBound) return;
  window.__plWishBound = true;

  const paint = (session: Session | null) => {
    document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((button) => {
      const on = isSaved(button.dataset.save ?? '', productIdOf(button.dataset.saveId), session);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      const label = on ? button.dataset.labelOn : button.dataset.labelOff;
      if (!label) return;
      button.title = label;
      const hidden = button.querySelector('.visually-hidden');
      if (hidden) hidden.textContent = label;
    });
    document.querySelectorAll<HTMLElement>('[data-wish-row]').forEach((row) => {
      row.hidden = !isSaved(row.dataset.wishSlug ?? '', productIdOf(row.dataset.wishId), session);
    });
    const shown = document.querySelectorAll('[data-wish-row]:not([hidden])').length;
    const empty = document.querySelector<HTMLElement>('[data-wish-empty]');
    if (empty) empty.hidden = shown > 0;
    const heading = document.querySelector<HTMLElement>('[data-wish-heading]');
    if (heading) {
      heading.hidden = shown === 0;
      heading.textContent = (heading.dataset.template ?? '{n}').replace('{n}', String(shown));
    }
    const count = session?.user ? session.wishlist.length : guestSlugs().length;
    document.querySelectorAll<HTMLElement>('[data-wish-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    });
  };

  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-save]');
    if (!button?.dataset.save) return;
    event.preventDefault();
    event.stopPropagation();
    toggleSaved(button.dataset.save, productIdOf(button.dataset.saveId)).catch(() => {});
  });

  window.addEventListener('pl:wishlist', () => {
    getSession().then(paint).catch(() => paint(null));
  });
  onSession(paint);
  getSession()
    .then((session) => mergeGuestWishlist(session).then(() => paint(session)))
    .catch(() => paint(null));
}
