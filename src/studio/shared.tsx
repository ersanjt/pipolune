import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { api } from '../lib/api';
import type { User } from '../lib/session';
import type { StudioDictionary, StudioLang } from './i18n';

export interface Ctx {
  t: StudioDictionary;
  lang: StudioLang;
  me: User;
  go: (hash: string) => void;
}

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    if (!path) return;
    setError('');
    api<T>(path)
      .then(setData)
      .catch((e) => setError(e.message || 'error'));
  }, [path]);
  useEffect(reload, [path, ...deps]);
  return { data, setData, error, reload };
}

export function Loading({ ctx }: { ctx: Ctx }) {
  return (
    <p class="s-muted" role="status">
      ✦ {ctx.t.loading}
    </p>
  );
}

export function ErrorNote({ ctx, message }: { ctx: Ctx; message?: string }) {
  return (
    <p class="s-error" role="alert">
      {message || ctx.t.error}
    </p>
  );
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ComponentChildren }) {
  return (
    <header class="s-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p class="s-muted">{subtitle}</p>}
      </div>
      {children && <div class="s-head__actions">{children}</div>}
    </header>
  );
}

export function Panel({ title, action, children, class: cls }: { title?: string; action?: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <section class={`s-panel ${cls ?? ''}`}>
      {(title || action) && (
        <div class="s-panel__head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ value, label }: { value: string; label: string }) {
  return <span class={`s-badge s-badge--${value}`}>{label}</span>;
}

export function tryMoney(kurus: number): string {
  return '₺' + new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(kurus / 100);
}

export function shortDate(iso: string | null | undefined, lang: StudioLang): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat({ en: 'en-GB', tr: 'tr-TR', ru: 'ru-RU' }[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(iso));
}

export function dateTime(iso: string | null | undefined, lang: StudioLang): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat({ en: 'en-GB', tr: 'tr-TR', ru: 'ru-RU' }[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(iso));
}

export function Pager({ ctx, page, total, size, onPage }: { ctx: Ctx; page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div class="s-pager">
      <button type="button" class="s-btn s-btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {ctx.t.prev}
      </button>
      <span class="s-muted">
        {page} / {pages}
      </span>
      <button type="button" class="s-btn s-btn--ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {ctx.t.next}
      </button>
    </div>
  );
}

export const can = {
  products: (me: User) => ['owner', 'editor'].includes(me.role),
  orders: (me: User) => ['owner', 'fulfilment'].includes(me.role),
  owner: (me: User) => me.role === 'owner',
};
